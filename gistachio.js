// gistachio v0.1.0
// Copyright 2015 Stuart P. Bentley.
// This work may be used freely as long as this notice is included.
// The work is provided "as is" without warranty, express or implied.

var gistachio = {};
(function(){
  // Note: technically, only the API is case-insensitive, the main
  // gist.github.com pages actually do freak out if your gist ID uses
  // upper-case characters (tested Jan 5 2015)
  // Similarly, this is slightly more permissive than it should be for
  // matching Git addresses (it'll accept a slash and a ".js", for example).
  var gistUrlRegex = /^(?:(?:https?:)?\/\/|git@)?(?:gist\.github\.com(?:\/(?:[^\/]+\/)?|:)|api\.github\.com\/gists\/)?([0-9a-f]+)\.\w*$/i;
  gistachio.parseGistId = function parseGistId(url) {
    var match = gistUrlRegex.exec(url);
    return match && match[1].toLowerCase();
  };

  function xhrRequest(opts, cb) {
    var req = new XMLHttpRequest();
    function onReqLoad(evt) {
      try {
        var body = opts.type == 'json' ?
          JSON.parse(req.responseText) : req.responseText;
        if (req.status < 400) {
          cb(null, body);
        } else {
          cb(body);
        }
      } catch (err) {
        cb(err);
      }
    }
    function onReqError(evt) {
      return cb(evt);
    }
    req.addEventListener('load', onReqLoad);
    req.addEventListener('error', onReqError);
    req.addEventListener('abort', onReqError);
    req.addEventListener('timeout', onReqError);

    req.open(opts.method, opts.url, true, opts.username, opts.password);
    if (opts.authToken) {
      req.setRequestHeader('Authorization', 'token '+opts.authToken);
    }
    if (opts.body) {
      req.setRequestHeader('Content-Type', 'application/json');
      req.send(JSON.stringify(opts.body));
    } else {
      req.send();
    }
  }

  var apiRoot = 'https://api.github.com/gists';

  function gistReceiver(opts, cb) {
    return function receiveGist(err, body) {
      var waiting = 0;
      var resFiles = {};
      function getFullFile(url, filename) {
        function receiveFile(err, fileBody) {
          if (err && cb) {
            cb(err);
            cb = null;
          } else {
            waiting--;
            resFiles[filename] = fileBody;
            if (waiting == 0 && cb) {
              cb(null, resFiles);
            }
          }
        }
        waiting++;
        xhrRequest({method: 'GET', url: url,
          authToken: opts.accessToken,
          username: opts.username,
          password: opts.password}, receiveFile);
      }
      if (err && cb) {
        cb(err);
        cb = null;
      } else {
        for (var filename in body.files) {
          if(body.files[filename].truncated) {
            getFullFile(body.files[filename].raw_url, filename);
          } else {
            resFiles[filename] = body.files[filename].content;
          }
        }
        if (waiting == 0 && cb) {
          cb(null, resFiles);
        }
      }
    };
  }

  gistachio.getFiles = function getGistFiles(gistId, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = {};
    }

    xhrRequest({method: 'GET', type: 'json', url: apiRoot + '/' + gistId,
      authToken: opts.accessToken,
      username: opts.username,
      password: opts.password}, gistReceiver(opts, cb));
  };

  gistachio.postFiles = function postGistFiles(files, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = {};
    }
    function receivePostResponse(err, body) {
      if (err && cb) {
        cb(err);
        cb = null;
      } else {
        cb(null, body.id);
      }
    }
    for (var filename in files) {
      if (typeof files[filename] == 'string') {
        files[filename] = {content: files[filename]};
      }
    }
    xhrRequest({method: 'POST', type: 'json', url: apiRoot,
      body: {files: files, description: opts.description, public: opts.public},
      authToken: opts.accessToken,
      username: opts.username,
      password: opts.password}, receivePostResponse);
  };

  gistachio.patchFiles = function patchGistFiles(gistId, files, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = {};
    }
    for (var filename in files) {
      if (typeof files[filename] == 'string') {
        files[filename] = {content: files[filename]};
      }
    }
    xhrRequest({method: 'PATCH', type: 'json', url: apiRoot + '/' + gistId,
      body: {files: files, description: opts.description},
      authToken: opts.accessToken,
      username: opts.username,
      password: opts.password}, gistReceiver(opts, cb));
  };
}());
