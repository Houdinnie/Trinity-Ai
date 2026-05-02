---
title: Trinity AI Chart Analyzer
emoji: 🎯
colorFrom: orange
colorTo: red
sdk: docker
app_port: 3000
pinned: false
---

# Trinity AI Chart Analyzer (LZS Edition)

Trinity is an elite AI chart analyzer specialized in the **Liquidity-Zone Shift (LZS)** strategy. It merges Supply/Demand, EMA/Impulse patterns, and Liquidity Engineering to provide high-probability institutional sniper entries.

## Features

- **AI Chart Analysis**: Powered by Groq's Llama 3.2 Vision API for institutional-grade market insights.
- **LZS Strategy Integration**: Rules-based framework identifying CT AOL, ST1 Liquidity Engineering, and ET Impulse/Retest.
- **Precision Sniper Entries**: Identifies entry zones, stop losses, and take profit levels with structure-based logic.
- **Real-time Data**: Integrated with Firebase for secure data storage and real-time updates.
- **Experience Levels**: Tailored analysis for both BEGINNER and ADVANCED traders.

## Setup

### Environment Variables

Create a `.env` file based on `.env.example` and add your API keys:

```env
GROQ_API_KEY="your_groq_api_key"
```

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### GitHub

1. Initialize a git repository:
   ```bash
   git init
   ```
2. Add your files:
   ```bash
   git add .
   ```
3. Commit your changes:
   ```bash
   git commit -m "Initial commit"
   ```
4. Push to your GitHub repository:
   ```bash
   git remote add origin https://github.com/yourusername/trinity-ai.git
   git push -u origin main
   ```

### Hugging Face Spaces

This repository is set up for deployment on Hugging Face Spaces using Docker.
1. Create a new Space on Hugging Face.
2. Select **Docker** as the SDK.
3. Push your code to the Space's repository.
4. Add your `GROQ_API_KEY` to the Space's **Secrets** in the settings.

## License

MIT
