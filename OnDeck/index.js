const fetch = require('node-fetch');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let reply = "HI THERE";
    let releaseResponse = '';
    const owner = "Qualtrax";
    const name = "Qualtrax";
    let query = `query GetRelease($owner: String!, $name: String!){
      repository(owner: $owner, name: $name) {
        refs(last: 1, refPrefix: "refs/tags/") {
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
    .then(data => reply = data);

    const date = reply.data.repository.refs.tags[0].node.tag.commit.committedDate;
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

    const commits = commitResponse.data.repository.defaultBranchRef.target.history.commits;
    const gitHubIssues = commits.filter(node => node.commit.messageHeadline.startsWith('['));
    const bulletedList = gitHubIssues.map(issue => {
      return `• ${ issue.commit.messageHeadline }`;
    });

    if (req.query.name || (req.body && req.body.name)) {
        context.res = {
            body: {
              "text": bulletedList.join(' \n ')
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
};