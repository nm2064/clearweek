# Making a change

Run the app with Node.js 22 or newer using `node --run start`. Run `node --run check` before opening a pull request.

Keep changes small and explain what someone using the app will notice. Use plain language in comments and messages. Add a test when changing a planning rule, backup format, or calendar export.

Check narrow screens and keyboard use when changing the interface. Use text nodes for task content. Keep task data on the device and avoid adding external services without explaining their effect.

If you change files listed in `sw.js`, increase its cache version so returning visitors receive the update.
