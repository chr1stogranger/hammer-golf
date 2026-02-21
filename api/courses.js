// Vercel Serverless Function — proxies golf course API requests
// Keep your API key hidden server-side via environment variable

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Search query required (min 2 characters)" });
  }

  const API_KEY = process.env.GOLF_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: "Golf API key not configured. Add GOLF_API_KEY to Vercel environment variables.",
      setup: "Go to golfcourseapi.com, sign up free, then add your key in Vercel → Settings → Environment Variables"
    });
  }

  try {
    // GolfCourseAPI.com search endpoint
    const url = `https://api.golfcourseapi.com/v1/courses?search=${encodeURIComponent(q)}`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Key ${API_KEY}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      // Fallback: try alternate endpoint format
      const altUrl = `https://api.golfcourseapi.com/v1/search?name=${encodeURIComponent(q)}`;
      const altResponse = await fetch(altUrl, {
        headers: {
          "Authorization": `Key ${API_KEY}`,
          "Accept": "application/json"
        }
      });

      if (!altResponse.ok) {
        return res.status(response.status).json({
          error: "Golf API returned an error",
          status: response.status
        });
      }

      const altData = await altResponse.json();
      return res.status(200).json({ courses: altData.courses || altData.results || altData || [] });
    }

    const data = await response.json();

    // Normalize response - different APIs return different structures
    const courses = data.courses || data.results || (Array.isArray(data) ? data : []);

    return res.status(200).json({ courses });

  } catch (error) {
    console.error("Golf API error:", error);
    return res.status(500).json({ error: "Failed to fetch course data", message: error.message });
  }
}
