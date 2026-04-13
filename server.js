const https = require('https');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.REPLICATE_TOKEN;
const MODEL = "35d5f7a9d7b48b44c81ef2d8f7f34c96af6fb9c7";

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function makeRequest(method, path, data, callback) {
  const options = {
    hostname: 'api.replicate.com',
    port: 443,
    path: path,
    method: method,
    headers: {
      'Authorization': 'Token ' + TOKEN,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, function(res) {
    let body = '';
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() { callback(null, body); });
  });

  req.on('error', function(e) { callback(e); });
  if (data) req.write(JSON.stringify(data));
  req.end();
}

const server = require('http').createServer(function(req, res) {

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders());
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, corsHeaders());
    res.end(JSON.stringify({ status: 'CartoonMe API is running!' }));
    return;
  }

  // Start cartoon generation
  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        const data = JSON.parse(body);
        const payload = {
          version: MODEL,
          input: {
            image: data.image,
            style: data.style,
            prompt: 'cartoon character, ' + data.styleName + ' style, high quality',
            negative_prompt: 'ugly, blurry, bad anatomy',
            num_outputs: 1
          }
        };
        makeRequest('POST', '/v1/predictions', payload, function(err, result) {
          if (err) {
            res.writeHead(500, corsHeaders());
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, corsHeaders());
          res.end(result);
        });
      } catch(e) {
        res.writeHead(400, corsHeaders());
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // Check cartoon status
  if (req.method === 'GET' && req.url.startsWith('/status/')) {
    const id = req.url.replace('/status/', '');
    makeRequest('GET', '/v1/predictions/' + id, null, function(err, result) {
      if (err) {
        res.writeHead(500, corsHeaders());
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, corsHeaders());
      res.end(result);
    });
    return;
  }

  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, function() {
  console.log('CartoonMe server running on port ' + PORT);
});
