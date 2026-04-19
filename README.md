# Cognix: AI-Powered Social Decision Engine

Cognix is a cinematic social debate platform that leverages advanced AI to help people resolve complex life dilemmas and moderate intense debates.

## Inspiration
The inspiration for Cognix came from the growing complexity of life choices in the social media era. We noticed that people often struggle with "analysis paralysis" when facing career pivots, relationship hurdles, or lifestyle changes. We wanted to build a "Thinking Machine" that doesn't just give advice, but maps out the psychological and practical landscape of a decision.

## What it does
Cognix acts as a cinematic AI moderator and consultant.
- **Problem Mode**: Evaluates a personal dilemma, breaks it down into an "Understanding" layer, generates three distinct paths with pros/cons/risks, and provides a final data-backed recommendation.
- **Debate Mode**: Allows multiple people to enter a shared "Social Room." Cognix moderates the viewpoints, scores them based on clarity, evidence, and fairness, and delivers a final verdict on which side made the strongest case.

## How we built it
- **Frontend**: A custom "Premium Cinematic" UI built with HTML5, CSS3 (Glassmorphism), and **GSAP** for high-fidelity text scrambling and UI transitions.
- **AI Engine**: Powered by the **Gemini 2.5 Flash** model for reasoning and structured JSON output.
- **Voice**: Integrated **ElevenLabs API** to give Cognix a realistic voice, allowing it to "speak" its conclusions.
- **Backend**: **Node.js/Express** served as the orchestration layer, with **Firebase** handling social room synchronicity and real-time debate updates.

## Challenges we ran into
- **Real-time Sync**: Coordinating multiple typists in a social debate room and ensuring the AI judges the collective state without losing context.
- **Cinematic Pacing**: Fine-tuning the "Thinking Loop" to feel alive—balancing smooth GSAP animations with the latency of AI generation.
- **State Management**: Managing the transition between "Idle," "Thinking," and "Result" states across separate modules (Problem vs. Debate).

## Accomplishments that we're proud of
- **Structured Reasoning**: Designing a protocol where the AI returns highly structured evaluations that fit perfectly into a data-dense grid.
- **Aesthetic Precision**: Achieving a "Premium Social" look that feels more like a cinematic Command Center than a typical chatbot.
- **The Thinking Loop**: Creating an atmospheric experience during the AI processing phase that builds anticipation rather than frustration.

## What we learned
- The importance of **Structured JSON schemas** when building agentic UI/UX—it's the glue between raw AI thought and beautiful design.
- How **GSAP** can transform a static web application into an immersive experimental playground.
- Handling race conditions in **Firebase Firestore** for real-time collaboration.

## What's next for Cognix
- **Multi-Agent Debates**: Letting two specialized AI models debate against each other based on user prompts.
- **Dilemma Export**: Generating "Decision Reports" in PDF format for users to share with mentors.
- **Mobile Immersion**: Building a native mobile experience with haptic feedback synchronized with the thinking pulses.
