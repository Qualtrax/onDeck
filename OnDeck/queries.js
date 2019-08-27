const getReleases = `query GetReleases($owner: String!, $name: String!){
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
const getCommits = `query GetCommits($owner: String!, $name: String!, $date: GitTimestamp!){
  repository(owner: $owner, name: $name) {
    master: object(expression: "master") {
      ... on Commit {
        history(since: $date) {
          commits: nodes {
            committedDate
            messageHeadline
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
}`;
const getMasterAndDevCommits = `query GetCommits($owner: String!, $name: String!){
  repository(owner: $owner, name: $name) {
    master: object(expression: "master") {
      ... on Commit {
        history(first: 50) {
          commits: nodes {
            hash: oid
            committedDate
            messageHeadline
          }
        }
      }
    }
    develop: defaultBranchRef {
      target {
        ... on Commit {
          history(first: 50) {
            commits: edges {
              commit: node {
                ... on Commit {
                  hash: oid
                  committedDate
                  messageHeadline
                }
              }
            }
          }
        }
      }
    }
  }
}`;

module.exports = {
  getReleases,
  getCommits,
  getMasterAndDevCommits
}