const https = require('https');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.REPLICATE_TOKEN;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function makeRequest(method, path, data, callback) {
  const body = data ? JSON.stringify(data) : null;
  const options = {
    hostname: 'api.replicate.com',
    port: 443,
    path: path,
    method: method,
    headers: {
      'Authorization': 'Token ' + TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': body ? Buffer.byteLength(body) : 0
    }
  };

  const req = https.request(options, function(res) {
    let result = '';
    res.on('data', function(chunk) { result += chunk; });
    res.on('end', function() { callback(null, result); });
  });

  req.on('error', function(e) { callback(e); });
  if (body) req.write(body);
  req.end();
}

const server = require('http').createServer(function(req, res) {

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders());
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, corsHeaders());
    res.end(JSON.stringify({ status: 'CartoonMe API running!' }));
    return;
  }

  // Generate cartoon
  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        const data = JSON.parse(body);

        // Use fofr/face-to-many model
        const payload = {
          version: "35d5f7a9d7b48b44c81ef2d8f7f34c96af6fb9c7d3a76c1e",
          input: {
            image: data.image,
            style: data.style,
            prompt: data.styleName + ' style cartoon character, high quality',
            negative_prompt: 'ugly, blurry, bad anatomy',
            num_outputs: 1
          }
        };

        // Try with model name directly
        makeRequest('POST', '/v1/models/fofr/face-to-many/predictions', {
          input: {
            image: data.image,
            style: data.style,
            prompt: data.styleName + ' style cartoon character, high quality',
            negative_prompt: 'ugly, blurry',
            num_outputs: 1
          }
        }, function(err, result) {
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
        res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
      }
    });
    return;
  }

  // Check status
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
