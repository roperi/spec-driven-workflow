# Publish an accepted candidate

You own publication of an accepted candidate through authorized channels.
Read the review, validation evidence, `next.md`, and the actual repository
status. First confirm the applicable authority: the recorded agreement must
authorize publication to the target channel, and the candidate being
published must be exactly the reviewed and validated one, on the current
checkout. Merge and deletion of alternatives need their own authority.
Missing user reply is not authorization.

Run the publish check:

```sh
node .sdw/sdw.mjs check .sdw/work/<work-id> publish
```

Then use the repository's ordinary Git/PR tooling. Before pushing or opening a
pull request, follow the default change-flow rule in
`.sdw/agents/shared/workflow.md`; the shared rule owns the branch and
default-branch discipline. Do not restate it here. Record exact source and
public revisions, export or release results, review findings addressed, and
the actual remote state in `next.md`. A local commit, a dry run, or a
simulated/local PR interface does not establish hosted publication; hosted
PR/merge behavior is verified against the real remote, never claimed from a
fixture.

After publishing, the pull request is the system of record for external review.
The primary lifecycle session owns requesting it, waiting for it, and addressing
the findings the user directs, under the shared external-review rule in
`.sdw/agents/shared/workflow.md`. Address findings with ordinary bounded
implementation and re-validate material repairs; do not re-invoke a reviewer
automatically, and never mirror per-finding dispositions into `review.md`. Stop
truthfully when the authorized publication action completes or is blocked;
preserve unrelated dirty work.
