const fetch = require('node-fetch');
const queries = require('./queries');
const owner = "Qualtrax";
const name = "Qualtrax";

const getTags = async function() {
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
    const isMajor = function(tagName) {
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

    return majorTags.sort(function(a, b) {
      return a.committedDate < b.committedDate;
    });
}

const getIssuesSince = async function(date) {
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

  let commits = await commitResponse.data.repository.defaultBranchRef.target.history.commits;
  let gitHubIssues = commits.filter(node => node.commit.messageHeadline.startsWith('['));
  
  return gitHubIssues.map(issue => {
    return {
      message: issue.commit.messageHeadline,
      link: parseLink(issue.commit.messageHeadline)
    }
  });
}

const parseLink = function(gitHubCommitMessage) {
  const issueNumberRegEx = /\[(.*?)\]/;
  const issueHeading = gitHubCommitMessage.match(issueNumberRegEx)[1];
  const isWeb = issueHeading.startsWith('ghweb');

  if (isWeb)
    return getQualtraxWebRepoLink(issueHeading.replace('ghweb', ''));
  else
    return getQualtraxRepoLink(issueHeading.replace('gh', ''));
}

const getQualtraxRepoLink = function(gitHubIssueNumber) {
  return `https://github.com/Qualtrax/Qualtrax/issues/${gitHubIssueNumber}`;
}

const getQualtraxWebRepoLink = function(gitHubIssueNumber) {
  return `https://github.com/Qualtrax/qualtrax-web/issues/${gitHubIssueNumber}`;
}

module.exports = {
  getTags,
  getIssuesSince
}