const moment = require('moment');
const gitHubService = require('./gitHubService');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let commitsFromDev = await gitHubService.getCommitsJustOnDev();
    let sortedTags = await gitHubService.getTags()
    let tag = sortedTags[0];
    let date = moment(tag.committedDate).add(1, 'seconds');
    let responses = [];

    if (commitsFromDev.length) {
      const bulletedList = commitsFromDev.map(issue => {
        return `:moneybag: <${issue.link}|${ issue.message }>`;
      });
      const moneyBags = commitsFromDev.map(issue => ":moneybag:");
      bulletedList.unshift(`*Commits since \`${tag.name}\` (_${moment(tag.committedDate).fromNow()}_): *`);
      bulletedList.push('');
      bulletedList.push(`:koala: *Should we be shipping this value?* ${moneyBags.join('')}`);
      responses = bulletedList;
    }
    else {
      date = moment(sortedTags[1].committedDate).add(1, 'seconds');
      let gitHubIssues = await gitHubService.getIssuesSince(date)

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