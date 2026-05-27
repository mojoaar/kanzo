window.Kanzo = window.Kanzo || {};

Kanzo.GitHubClient = function (token, repo, branch) {
  this.token = token;
  this.repo = repo;
  this.branch = branch || "main";
};

Kanzo.GitHubClient.prototype._headers = function () {
  return {
    Authorization: "token " + this.token,
    Accept: "application/vnd.github.v3+json",
  };
};

Kanzo.GitHubClient.prototype.getFile = function (path) {
  var self = this;
  var url =
    Kanzo.GITHUB_API +
    "/repos/" +
    self.repo +
    "/contents/" +
    path +
    "?ref=" +
    self.branch;
  return fetch(url, { headers: self._headers() })
    .then(function (res) {
      if (!res.ok) throw new Error("GitHub: file not found");
      return res.json();
    })
    .then(function (data) {
      var decoded;
      try {
        decoded = JSON.parse(atob(data.content));
      } catch (e) {
        decoded = [];
      }
      return { content: decoded, sha: data.sha };
    });
};

Kanzo.GitHubClient.prototype.putFile = function (path, content, sha) {
  var self = this;
  var url = Kanzo.GITHUB_API + "/repos/" + self.repo + "/contents/" + path;
  var body = {
    message: "Update " + path,
    content: btoa(
      unescape(encodeURIComponent(JSON.stringify(content, null, 2))),
    ),
    branch: self.branch,
  };
  if (sha) body.sha = sha;
  return fetch(url, {
    method: "PUT",
    headers: self._headers(),
    body: JSON.stringify(body),
  }).then(function (res) {
    if (!res.ok) {
      return res
        .json()
        .then(function (err) {
          throw new Error(
            "GitHub: " +
              (err.message || "put failed (HTTP " + res.status + ")"),
          );
        })
        .catch(function () {
          throw new Error("GitHub: put failed (HTTP " + res.status + ")");
        });
    }
    return res.json();
  });
};

Kanzo.GitHubClient.prototype.listFiles = function (path) {
  var self = this;
  var url =
    Kanzo.GITHUB_API +
    "/repos/" +
    self.repo +
    "/contents/" +
    path +
    "?ref=" +
    self.branch;
  return fetch(url, { headers: self._headers() }).then(function (res) {
    if (!res.ok) throw new Error("GitHub: list failed");
    return res.json();
  });
};

Kanzo.GitHubClient.prototype.getUser = function () {
  var self = this;
  return fetch(Kanzo.GITHUB_API + "/user", { headers: self._headers() }).then(
    function (res) {
      if (!res.ok) throw new Error("GitHub: user fetch failed");
      return res.json();
    },
  );
};
