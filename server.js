import fs from 'fs-extra';
import https from 'https';
import express from 'express';
import cors from 'cors';
import os from 'os';
import OpenAI from 'openai';

import { fetchAndCache } from './cache.js';
import HttpError from './HttpError.js';
import recipeFunctionCallSchema from './recipe_function_call_schema.json' assert { type: 'json' };

const app = express();
const PORT = 3010;

const GPT_MODEL = 'gpt-4o';
const SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are "Kitchen Buddy", an expert in the kitchen that helps with cooking and baking recipes. Your task is to listen to the user's query and determine if any of the available function calls should be made in response to it, or if the user just needs some information. Keep your responses short and to the point. Do not be too verbose in your responses. The user has some special instructions, which are listed below:

 * Organize the ingredients according to where they are found in my kitchen: Onions are kept on the counter. Butter, garlic, and cheeses are kept in the refrigerator. Meats such as chicken, beef, and pork are ALWAYS kept in the refrigerator. Vegetables and fresh herbs are ALWAYS kept in the refrigerator. Olive oil, spices, flour, sugar and salt are kept in the cabinet. Canned goods, rice and pastas are kept in the pantry.
 * Always include the amounts of the ingredients in the both the ingredients list and the recipe steps; don't forget to include the amounts in the recipe steps.
 * If some preparation is implied for an ingredient in the ingredients list, add the preparation as a step to the beginning of the recipe. For example, if the ingredient is "1 yellow onion, diced", change it to say "1 yellow onion" and add "Dice 1 yellow onion." as a recipe step. This should be done for all ingredients that need preparation, including parsley, cilantro and other fresh herbs.`
};

const openai = new OpenAI();

app.use(cors());
app.use(express.json());

// Serve static files from the 'web' directory
app.use(express.static('web'));

app.get('/fetch-recipe', async (req, res) => {
  const { url } = req.query;
  console.log('Url: ' + url);

  try {
    const html = await fetchAndCache(url);
    const recipe = await parseRecipe(html);
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch the recipe.' });
    console.error(error);
  }
});

async function parseRecipe(html) {
  const prompt = `Parse the following HTML and extract the recipe information into a function call called "fetch_recipe".

HTML:

${html}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        SYSTEM_MESSAGE,
        {
          role: 'user',
          content: prompt
        }
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'provide_recipe'
        }
      },
      tools: [{
        type: 'function',
        'function': recipeFunctionCallSchema
      }]
    });

    try {
      const { content, tool_calls } = completion.choices[0].message;

      // Find the tool call with function name "provide_recipe"
      const provideRecipeCall = tool_calls.find(call =>
        call.type === 'function' && call.function.name === 'provide_recipe');

      if (provideRecipeCall) {
        const recipe = JSON.parse(provideRecipeCall.function.arguments);
        return {
          message: content,
          recipe,
        };
      }
      else {
        throw new HttpError(404, 'Function provide_recipe not found in tool_calls.');
      }
    } catch (error) {
      console.error(error);
      throw new HttpError(500, 'Failed to parse function arguments as JSON.');
    }
  }
  catch (error) {
    console.error("Error parsing recipe:", error);
    throw new HttpError(500, 'Failed to parse the recipe.');
  }
}

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Create an HTTPS server

// Read SSL certificate files
const credentials = {
  key: fs.readFileSync('key.pem', 'utf8'),
  cert: fs.readFileSync('cert.pem', 'utf8'),
};

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
  console.log(`HTTPS Server is running on https://${getLocalIPAddress()}:${PORT}`);
});
