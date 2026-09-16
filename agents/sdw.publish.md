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

Then use the repository's ordinary Git/PR tooling. Record exact source and
public revisions, export or release results, review findings addressed, and
the actual remote state in `next.md`. A local commit, a dry run, or a
simulated/local PR interface does not establish hosted publication; hosted
PR/merge behavior is verified against the real remote, never claimed from a
fixture.

After publishing, check actual remote status before merge/finalization
steps. Authorized review findings are addressed per the agreement. Consume
external findings under the shared external-review-consumption rule in
`.sdw/agents/shared/workflow.md` before finalize: one disposition per finding,
stop on the recorded convergence condition, and never self-close a semantic
decline about the judge. Stop truthfully when the authorized publication action
completes or is blocked; preserve unrelated dirty work.
