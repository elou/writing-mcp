```javascript
const { Client } = require('@notionhq/client');

// Initialize Notion client
const notion = new Client({ 
  auth: process.env.NOTION_API_KEY 
});
const databaseId = process.env.NOTION_DATABASE_ID;

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Handle MCP protocol requests
  const { action, params } = req.body;
  
  try {
    switch (action) {
      case 'storeEntry':
        // Store voice message transcription in Notion
        const { text, prompt } = params;
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Title: { title: [{ text: { content: prompt } }] },
            Response: { rich_text: [{ text: { content: text } }] },
            Date: { date: { start: new Date().toISOString() } }
          }
        });
        return res.json({ success: true });
        
      case 'getEntries':
        // Retrieve previous entries for prompt generation
        const response = await notion.databases.query({
          database_id: databaseId,
          sorts: [{ property: 'Date', direction: 'descending' }],
          page_size: 10
        });
        
        const entries = response.results.map(page => ({
          prompt: page.properties.Title.title[0]?.text.content,
          response: page.properties.Response.rich_text[0]?.text.content,
          date: page.properties.Date.date.start
        }));
        
        return res.json({ entries });
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
```
