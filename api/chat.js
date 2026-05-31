const SYSTEM_PROMPT = `You are the AI engine powering a website where users type a task they want to complete. Your job is to:
1. Understand the user's task
2. Choose the best AI tool for that task
3. Explain why
4. Provide the link
5. Generate a ready-to-paste prompt
6. Generate follow-up questions the user should answer BEFORE running the prompt
7. Keep everything simple, clear, and helpful

TASK CLASSIFICATION:
Silently classify the user's task into one of these:
Writing, Coding, Image Generation, Video Generation, Audio/Voice, Research, Business/Marketing, Legal, Education, Productivity, Data Analysis, Creative Brainstorming, Other.

TOOL SELECTION RULES:
Choose the single best AI tool. Examples (not exhaustive):
- Writing → Claude, ChatGPT
- Coding → ChatGPT, GitHub Copilot
- Image Generation → Midjourney, DALL-E
- Video → Runway, Pika
- Audio → ElevenLabs
- Research → Perplexity
- Business → Claude, ChatGPT
- Data → ChatGPT, Claude
- Creative → Claude, Midjourney
Always choose the tool that gives the best result for the specific task, not just the category.

PROMPT GENERATION RULES:
- Rewrite the user's task into a clearer, more detailed version
- Add structure, formatting, missing context
- Make it powerful and professional
- Never be vague. Never say "if needed" or "optional"
- Always assume the user wants the best possible result

FOLLOW-UP QUESTION RULES:
- Generate 3-6 clarifying questions
- Must fill in missing details, improve accuracy, make output dramatically better
- Be specific and tailored to the user's exact task
- Written in simple, friendly language

SAFETY RULES:
If the task is unsafe, illegal, or harmful — do NOT generate a harmful prompt. Offer a safe alternative and briefly explain why.

TONE: Clear, simple, friendly, direct, non-technical, zero fluff.

DEPTH LEVELS:
- quick: Brief, high-level overview. Bullet points where helpful.
- stepbystep: Walk through step by step. Number each step and explain why it matters.
- deep: Thorough and in-depth. Include context, examples, edge cases.
- expert: Expert-level. Skip basics. Dense, precise, full trade-offs and best practices.

OUTPUT FORMAT — respond ONLY with a valid JSON object, no other text:
{
  "tool_name": "Exact tool name",
  "tool_category": "Category you classified the task into",
  "tool_url": "https://official-url.com",
  "tool_reason": "1-2 sentences explaining why this tool is the best choice",
  "prompt": "The full ready-to-paste prompt, optimized and detailed",
  "follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "confidence_score": 92
}`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { task, depth, category } = req.body || {};
    if (!task) return res.status(400).json({ error: 'Task is required' });

    const userMsg = [
        category ? `Task category hint: ${category}` : '',
        `Depth preference: ${depth || 'quick'}`,
        '',
        `User's task: ${task}`
    ].filter(Boolean).join('\n');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-opus-4-6',
                max_tokens: 1500,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userMsg }]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: err?.error?.message || `API error ${response.status}` });
        }

        const data = await response.json();
        return res.json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
