// AI Service — calls OnSpace AI for parent assistant, teacher assistant, analytics
// Uses proper FunctionsHttpError handling
// Powered by OnSpace.AI

import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// Safely invoke an edge function with proper error extraction
async function invokeEdge<T = any>(fn: string, body: object): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const text = await error.context?.text();
        msg = `[${statusCode}] ${text || error.message}`;
      } catch {
        msg = error.message;
      }
    }
    return { data: null, error: msg };
  }
  return { data: data as T, error: null };
}

export interface StudentContext {
  name: string;
  section: string;
  attendancePct: number;
  pendingHomework: number;
  recentMarks?: string;
  missedLessons?: number;
}

// AI Parent Assistant — answers parent questions about their child
export async function askParentAssistant(
  question: string,
  context: StudentContext
): Promise<{ answer: string; error: string | null }> {
  const systemPrompt = `You are KVS EduShield AI Parent Assistant for Kendriya Vidyalaya Sangathan.
Student: ${context.name}, Section: ${context.section}
Attendance: ${context.attendancePct}%
Pending homework: ${context.pendingHomework} items
${context.recentMarks ? `Recent marks: ${context.recentMarks}` : ''}
${context.missedLessons ? `Missed lessons: ${context.missedLessons}` : ''}
Answer concisely in 2-3 sentences. Be encouraging but honest.`;

  const { data, error } = await invokeEdge('onspace-ai-chat', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });

  if (error) return { answer: '', error };
  const answer = data?.choices?.[0]?.message?.content ?? data?.text ?? '';
  return { answer, error: null };
}

// AI Teacher Assistant — help generate homework, lesson plans, student analysis
export async function askTeacherAssistant(
  prompt: string,
  context: { subject: string; section: string; topic?: string }
): Promise<{ result: string; error: string | null }> {
  const systemPrompt = `You are KVS EduShield AI Teacher Assistant for KVS school.
Subject: ${context.subject}, Section: ${context.section}
${context.topic ? `Current topic: ${context.topic}` : ''}
Provide practical, concise help. Format nicely with bullet points where relevant.`;

  const { data, error } = await invokeEdge('onspace-ai-chat', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });

  if (error) return { result: '', error };
  const result = data?.choices?.[0]?.message?.content ?? data?.text ?? '';
  return { result, error: null };
}

// AI Learning Gap Analysis
export async function generateLearningGapPlan(context: {
  studentName: string;
  missedTopics: string[];
  subject: string;
  attendancePct: number;
}): Promise<{ plan: string; error: string | null }> {
  const systemPrompt = `You are a KVS academic advisor. Generate a brief catch-up study plan.
Student: ${context.studentName}, Subject: ${context.subject}, Attendance: ${context.attendancePct}%
Missed topics: ${context.missedTopics.join(', ')}
Give a 3-5 step actionable plan with estimated time per step.`;

  const { data, error } = await invokeEdge('onspace-ai-chat', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: systemPrompt }],
  });

  if (error) return { plan: '', error };
  const plan = data?.choices?.[0]?.message?.content ?? data?.text ?? '';
  return { plan, error: null };
}

// AI Substitute Teacher Suggestion
export async function suggestSubstitute(context: {
  absentTeacher: string;
  subject: string;
  section: string;
  period: number;
  availableTeachers: string[];
}): Promise<{ suggestion: string; error: string | null }> {
  const systemPrompt = `You are a KVS timetable coordinator AI.
Absent: ${context.absentTeacher}, Subject: ${context.subject}, Section: ${context.section}, Period ${context.period}
Available teachers: ${context.availableTeachers.join(', ')}
Suggest the best substitute and reason in 2 sentences.`;

  const { data, error } = await invokeEdge('onspace-ai-chat', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: systemPrompt }],
  });

  if (error) return { suggestion: '', error };
  const suggestion = data?.choices?.[0]?.message?.content ?? data?.text ?? '';
  return { suggestion, error: null };
}

// AI Risk Prediction for at-risk students
export async function predictAtRiskStudents(students: Array<{
  name: string; section: string; attendancePct: number; pendingHW: number;
}>): Promise<{ analysis: string; error: string | null }> {
  const top10 = students.slice(0, 10);
  const systemPrompt = `Identify at-risk students from this data and explain why in bullet points:
${top10.map(s => `${s.name} (${s.section}): ${s.attendancePct}% attendance, ${s.pendingHW} HW pending`).join('\n')}`;

  const { data, error } = await invokeEdge('onspace-ai-chat', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: systemPrompt }],
  });

  if (error) return { analysis: '', error };
  const analysis = data?.choices?.[0]?.message?.content ?? data?.text ?? '';
  return { analysis, error: null };
}

// Voice lesson parsing — extract subject/chapter/topic from voice text
export async function parseVoiceLesson(voiceText: string): Promise<{
  subject: string; chapter: string; topic: string; error: string | null;
}> {
  const { data, error } = await invokeEdge('onspace-ai-chat', {
    mode: 'parse_lesson',
    voiceText,
  });

  if (error) return { subject: '', chapter: '', topic: '', error };
  const parsed = data?.parsed ?? {};
  return {
    subject: parsed.subject ?? '',
    chapter: parsed.chapter ?? '',
    topic: parsed.topic ?? '',
    error: null,
  };
}
