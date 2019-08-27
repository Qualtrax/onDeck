const fetch = require('node-fetch');
const queries = require('./queries');
const owner = "Qualtrax";
const name = "Qualtrax";

const getTags = async function () {
  let releaseResponse = '';

  await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
    },
    body: JSON.stringify({
      query: queries.getReleases,
      variables: { owner, name }
    })
  })
    .then(r => r.json())
    .then(data => releaseResponse = data);

  const responseTags = releaseResponse.data.repository.refs.tags;
  const isMajor = function (tagName) {
    return tagName.split('.')[3] == '0';
  }

  const tags = responseTags.map(element => {
    return {
      name: element.node.tag.name,
      committedDate: element.node.tag.commit.committedDate,
      isMajor: isMajor(element.node.tag.name)
    };
  });

  const majorTags = tags.filter(tag => tag.isMajor);

  return majorTags.sort(function (a, b) {
    return a.committedDate < b.committedDate;
  });
}

const getIssuesSince = async function (date) {
  let commitResponse = '';
  await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
    },
    body: JSON.stringify({
      query: queries.getCommits,
      variables: { owner, name, date }
    })
  })
    .then(r => r.json())
    .then(data => commitResponse = data);

  let commits = commitResponse.data.repository.master.history.commits;
  let gitHubIssues = commits.filter(commit => commit.messageHeadline.startsWith('['));

  return gitHubIssues.map(issue => {
    return {
      message: issue.messageHeadline,
      link: parseLink(issue.messageHeadline)
    }
  });
}

const parseLink = function (gitHubCommitMessage) {
  const issueNumberRegEx = /\[(.*?)\]/;
  const issueHeading = gitHubCommitMessage.match(issueNumberRegEx)[1];
  const isWeb = issueHeading.startsWith('ghweb');

  if (isWeb)
    return getQualtraxWebRepoLink(issueHeading.replace('ghweb', ''));
  else
    return getQualtraxRepoLink(issueHeading.replace('gh', ''));
}

const getQualtraxRepoLink = function (gitHubIssueNumber) {
  return `https://github.com/Qualtrax/Qualtrax/issues/${gitHubIssueNumber}`;
}

const getQualtraxWebRepoLink = function (gitHubIssueNumber) {
  return `https://github.com/Qualtrax/qualtrax-web/issues/${gitHubIssueNumber}`;
}

const getCommitsJustOnDev = async function () {
  let commitResponse = '';
  await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
    },
    body: JSON.stringify({
      query: queries.getMasterAndDevCommits,
      variables: { owner, name }
    })
  })
    .then(r => r.json())
    .then(data => commitResponse = data);

  const masterCommits = commitResponse.data.repository.master.history.commits;
  const developCommits = commitResponse.data.repository.develop.target.history.commits.map(node => {
    return { hash: node.commit.hash, messageHeadline: node.commit.messageHeadline, committedDate: node.commit.committedDate };
  });

  const masterHashes = masterCommits.map(commit => commit.hash);
  const developHashes = developCommits.map(commit => commit.hash);
  const hashesJustOnDev = developHashes.filter(hash => masterHashes.indexOf(hash) < 0);
  const commitsJustOnDev = developCommits.filter(commit => hashesJustOnDev.indexOf(commit.hash) >= 0);
  const commitsWithGitHubIssues = commitsJustOnDev.filter(commit => commit.messageHeadline.startsWith('['));
  const commitsWithIssueInformation = commitsWithGitHubIssues.map(commit => {
    return {
      message: commit.messageHeadline,
      link: parseLink(commit.messageHeadline)
    }
  });

  return commitsWithIssueInformation;
}

module.exports = {
  getTags,
  getIssuesSince,
  getCommitsJustOnDev
}