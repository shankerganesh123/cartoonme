const https = require('https');
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.REPLICATE_TOKEN;

const MODEL_VERSION = "35cea9c3164d9fb7fbd48b51503eabdb39c9d04fdaef9a68f368bed8087ec5f9";

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
      'Content-Type': 'application/json'
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

// Map our style names to what the model accepts
const STYLE_MAP = {
  '3d_animation': '3D',
  'anime':        'Emoji',
  'disney_charactor': '3D',
  'pixel_art':    'Pixels',
  'sketch':       'Clay',
  'watercolor':   'Toy'
};

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

  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        const data = JSON.parse(body);
        const mappedStyle = STYLE_MAP[data.style] || '3D';

        const payload = {
          version: MODEL_VERSION,
          input: {
            image: data.image,
            style: mappedStyle,
            prompt: 'a cartoon character',
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
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

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
