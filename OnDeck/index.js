const fetch = require('node-fetch');
const moment = require('moment');

const getQualtraxRepoLink = function(gitHubIssueNumber) {
  return `https://github.com/Qualtrax/Qualtrax/issues/${gitHubIssueNumber}`;
}

const getQualtraxWebRepoLink = function(gitHubIssueNumber) {
  return `https://github.com/Qualtrax/qualtrax-web/issues/${gitHubIssueNumber}`;
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

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let releaseResponse = '';
    const owner = "Qualtrax";
    const name = "Qualtrax";
    let query = `query GetReleases($owner: String!, $name: String!){
      repository(owner: $owner, name: $name) {
        refs(last: 10, refPrefix: "refs/tags/") {
          tags: edges {
            node {
              tag: target {
                ... on Tag {
                  id
                  name
                  commit: target {
                    ... on Commit {
                      id
                      committedDate
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
        },
        body: JSON.stringify({
          query,
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

    const sortedTags = majorTags.sort(function(a, b) {
      return a.committedDate < b.committedDate;
    });

    let tag = sortedTags[0];
    let date = moment(tag.committedDate).add(1, 'seconds');

    let commitResponse = '';
    query = `query GetCommits($owner: String!, $name: String!, $date: GitTimestamp!){
      repository(owner: $owner, name: $name) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(since: $date) {
                totalCount
                commits: edges {
                  commit: node {
                    ... on Commit {
                      committedDate
                      messageHeadline
                    }
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }
      }
    }`;

    await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
        },
        body: JSON.stringify({
          query,
          variables: { owner, name, date }
        })
    })  
    .then(r => r.json())
    .then(data => commitResponse = data);

    let commits = commitResponse.data.repository.defaultBranchRef.target.history.commits;
    let gitHubIssues = commits.filter(node => node.commit.messageHeadline.startsWith('['));
    gitHubIssues = gitHubIssues.map(issue => {
      return {
        message: issue.commit.messageHeadline,
        link: parseLink(issue.commit.messageHeadline)
      }
    })
    let responses = [];

    if (gitHubIssues.length) {
      const bulletedList = gitHubIssues.map(issue => {
        return `:moneybag: <${issue.link}|${ issue.message }>`;
      });
      const moneyBags = gitHubIssues.map(issue => ":moneybag:");
      bulletedList.unshift(`:qtrax: *Commits since \`${tag.name}\`:*`);
      bulletedList.push(":koala: *Should we be shipping this value?!* :koala:");
      bulletedList.push('');
      bulletedList.push('');
      bulletedList.push(moneyBags);
      responses = bulletedList;
    }
    else {
      date = moment(sortedTags[1].committedDate).add(1, 'seconds');
      
      commitResponse = '';
      query = `query GetCommits($owner: String!, $name: String!, $date: GitTimestamp!){
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            target {
              ... on Commit {
                history(since: $date) {
                  totalCount
                  commits: edges {
                    commit: node {
                      ... on Commit {
                        committedDate
                        messageHeadline
                      }
                    }
                  }
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                }
              }
            }
          }
        }
      }`;

      await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
          },
          body: JSON.stringify({
            query,
            variables: { owner, name, date }
          })
      })  
      .then(r => r.json())
      .then(data => commitResponse = data);

      commits = commitResponse.data.repository.defaultBranchRef.target.history.commits;
      gitHubIssues = commits.filter(node => node.commit.messageHeadline.startsWith('['));
      gitHubIssues = gitHubIssues.map(issue => {
        return {
          message: issue.commit.messageHeadline,
          link: parseLink(issue.commit.messageHeadline)
        }
      })

      const deliveredIssues = gitHubIssues.map(issue => {
        return `:moneybag: <${issue.link}|${ issue.message }>`;
      });

      responses = deliveredIssues;
      responses.unshift("*Here's what was included:*");
      responses.unshift('');
      responses.unshift(`:koala: *Nothing on deck because we just tagged the \`${tag.name}\` release ${moment(tag.committedDate).fromNow()}!* :confetti_ball:`)
    }

    if (responses.length) {
      context.res = {
        body: {
          "text": responses.join(' \n ')
        },
        headers: {
            'Content-Type': 'application/json'
        }
      };
    }
    else {
      context.res = {
        body: {
          "text": "Didn't find anything..."
        },
        headers: {
            'Content-Type': 'application/json'
        }
      };
    }
};