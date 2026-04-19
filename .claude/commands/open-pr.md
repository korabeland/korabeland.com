Push the current branch, generate the 6-element PR review page, and create or update the PR.

Steps:
1. Confirm we are NOT on `main` (abort if so — PRs go through branches)
2. Run `bash scripts/generate-pr-description.sh` (builds site, takes screenshots, commits them, runs Lighthouse + Chromatic + Claude summary, writes `.pr-description.md`)
3. Run `git push -u origin HEAD`
4. If a PR already exists for this branch: `gh pr edit --body-file .pr-description.md`
   Otherwise: `gh pr create --title "$(git log -1 --format=%s)" --body-file .pr-description.md`
5. Output the PR URL

Notes:
- Screenshots are committed to the branch by the script (step 2) before push (step 3), so Vercel serves them at the predicted preview URL
- If `CHROMATIC_PROJECT_TOKEN` is not set, the Chromatic section shows a setup note
- To push without generating the review page (WIP push): run `git push` directly or pass `--skip-review-page` to the script
