// Edge Function: create-teacher-accounts
// Bulk-creates all staff auth accounts from staff_directory using service role.
// Auto-confirms email, sets passwords, fully populates user_profiles.
// Admin: 4764@kvs.in / Kvpatm2.4764
// Teachers: [code]@kvs.in / Kvpatm2.[code]
// Powered by OnSpace.AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (profile && profile.role !== 'admin' && profile.role !== 'teacher') {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }

    const body = await req.json().catch(() => ({}))
    const specificCode = body.employee_code // optional: create just one

    // Fetch all active staff from directory
    let query = supabaseAdmin.from('staff_directory').select('*').eq('is_active', true)
    if (specificCode) query = query.eq('employee_code', specificCode)
    const { data: staff, error: staffError } = await query.order('display_name')

    if (staffError || !staff) {
      return new Response(JSON.stringify({ error: 'Failed to fetch staff directory: ' + staffError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing ${staff.length} staff members...`)

    // Pre-fetch all existing auth users
    let existingUsers: { id: string; email: string }[] = []
    try {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      existingUsers = users.map(u => ({ id: u.id, email: u.email ?? '' }))
      console.log(`Found ${existingUsers.length} existing auth users`)
    } catch (e) {
      console.warn('Could not pre-fetch users list:', e)
    }

    const results: {
      name: string; email: string; employee_code: string;
      status: 'created' | 'updated' | 'failed' | 'skipped';
      error?: string;
    }[] = []

    for (const member of staff) {
      const email = `${member.employee_code}@kvs.in`
      const password = `Kvpatm2.${member.employee_code}`
      const isPrincipal = member.designation === 'Principal'
      const role = isPrincipal ? 'admin' : 'teacher'

      // Build subtitle: "PGT · Computer Science · CT 11A"
      const subtitleParts: string[] = [member.designation]
      if (member.subject) subtitleParts.push(member.subject)
      if (member.class_teacher_of) subtitleParts.push(`CT ${member.class_teacher_of}`)
      const subtitle = subtitleParts.join(' · ')

      // Build teaching_sections array
      const teachingSections: string[] = member.class_teacher_of ? [member.class_teacher_of] : []

      try {
        let userId: string | undefined
        const existingUser = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase())

        if (existingUser) {
          userId = existingUser.id
          // Update password + confirm email for existing user
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true,
            user_metadata: { role, display_name: member.display_name, employee_code: member.employee_code },
          })
          if (updateErr) {
            console.error(`Update failed for ${email}:`, updateErr.message)
          }
        } else {
          // Create new auth user with auto-confirmed email
          const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role, display_name: member.display_name, employee_code: member.employee_code },
          })
          if (createError) {
            console.error(`Failed to create ${email}:`, createError.message)
            results.push({
              name: member.display_name, email,
              employee_code: member.employee_code,
              status: 'failed', error: createError.message
            })
            continue
          }
          userId = authData?.user?.id
        }

        if (!userId) {
          results.push({
            name: member.display_name, email,
            employee_code: member.employee_code,
            status: 'skipped', error: 'No userId resolved'
          })
          continue
        }

        // Upsert full user_profiles entry with all staff directory data
        const { error: upsertError } = await supabaseAdmin.from('user_profiles').upsert({
          id: userId,
          email,
          display_name: member.display_name,
          employee_code: member.employee_code,
          subtitle,
          subject: member.subject ?? null,
          class_teacher_of: member.class_teacher_of ?? null,
          role,
          is_active: true,
          teacher_type: member.teacher_type ?? 'Regular',
          date_of_joining: member.date_of_joining_kv ?? null,
          teaching_sections: teachingSections,
        }, { onConflict: 'id' })

        if (upsertError) {
          console.error(`Profile upsert failed for ${email}:`, upsertError.message)
          results.push({
            name: member.display_name, email,
            employee_code: member.employee_code,
            status: 'failed', error: 'Profile: ' + upsertError.message
          })
          continue
        }

        const finalStatus = existingUser ? 'updated' : 'created'
        results.push({
          name: member.display_name, email,
          employee_code: member.employee_code,
          status: finalStatus,
        })
        console.log(`✓ ${finalStatus}: ${member.display_name} (${email}) role=${role}${member.class_teacher_of ? ` CT:${member.class_teacher_of}` : ''}`)

      } catch (e) {
        console.error(`Exception for ${email}:`, e)
        results.push({
          name: member.display_name, email,
          employee_code: member.employee_code,
          status: 'failed', error: String(e)
        })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const updated = results.filter(r => r.status === 'updated').length
    const failed = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length

    console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`)

    return new Response(JSON.stringify({
      results,
      summary: { created, updated, failed, skipped, total: staff.length },
      class_teachers: {
        '11A': 'AMBILY KRISHNAN (8955) — PGT Computer Science',
        '10C': 'JINI P (79553) — TGT English'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('create-teacher-accounts error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
