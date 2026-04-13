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

        // Use catacolabs/cartoonify — true cartoon transformation
        // preserves face features with strong cartoon effect
        const payload = {
          version: "a674d7f5d95cd8b47d5f3e44a03e6a06ae3ad585898edf28d5ba2ebe2a8e51b2",
          input: {
            image: data.image
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
  console.log('CartoonMe API running on port ' + PORT);
});
