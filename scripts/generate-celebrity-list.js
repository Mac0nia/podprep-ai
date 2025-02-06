import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { dirname } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OUTPUT_FILE = path.join(__dirname, '../src/data/well-known-figures.json');

async function generateWellKnownFigures() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  const categories = [
    'Tech Leaders and Entrepreneurs',
    'Business and Finance',
    'Media and Entertainment',
    'Science and Innovation',
    'Social Media Influencers'
  ];

  const allFigures = [];

  for (const category of categories) {
    try {
      console.log(`Generating figures for category: ${category}`);
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo', // Update to the desired OpenAI model
          messages: [
            {
              role: 'system',
              content: `You are a knowledgeable assistant helping to identify well-known public figures that should be filtered from podcast guest suggestions. Focus on currently active and extremely high-profile individuals who would overshadow any podcast they appear on.
              
              Important guidelines:
              1. Only include the most prominent, globally recognized figures
              2. Focus on Fortune 500 CEOs, world-famous entrepreneurs, and household names
              3. DO NOT include social media personalities or influencer-entrepreneurs like Gary Vaynerchuk
              4. DO NOT include mid-tier tech executives or regional business leaders
              
              IMPORTANT: Return ONLY a valid JSON array of strings. No other text or explanation.`
            },
            {
              role: 'user',
              content: `Generate a list of 20-30 extremely high-profile figures in the category: ${category}.
              For tech leaders, focus on founders and CEOs of major tech companies (Fortune 500, FAANG, etc).
              Only include individuals who are instantly recognizable to the general public.
              
              Return ONLY a JSON array of names, like this exact format:
              ["Mark Zuckerberg", "Elon Musk", "Tim Cook", "Satya Nadella"]
              
              No other text or explanation, just the JSON array.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let figures;
      try {
        const content = response.data.choices[0].message.content.trim();
        figures = JSON.parse(content);
        
        if (!Array.isArray(figures)) {
          throw new Error('Response is not an array');
        }
        
        allFigures.push(...figures.map(name => ({ name })));
        console.log(`Added ${figures.length} figures from category: ${category}`);
      } catch (error) {
        console.error(`Error parsing figures for category ${category}:`, error);
      }

      // Add a delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error generating figures for category ${category}:`, error);
    }
  }

  // Remove duplicates based on name
  const uniqueFigures = Array.from(
    new Map(allFigures.map(figure => [figure.name.toLowerCase(), figure])).values()
  );

  return uniqueFigures;
}

async function main() {
  try {
    console.log('Generating well-known figures list...');
    const figures = await generateWellKnownFigures();
    
    // Create the data directory if it doesn't exist
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    // Write the figures to a JSON file
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify(figures, null, 2),
      'utf-8'
    );

    console.log(`Successfully generated ${figures.length} well-known figures`);
    console.log(`Output written to: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();