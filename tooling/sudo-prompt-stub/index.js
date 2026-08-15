// Windows Bun cannot extract the published @expo/sudo-prompt tarball.
// Expo CLI only uses this for elevated native prompts, unused in this scaffold.
module.exports = function sudoPrompt() {
  throw new Error("@expo/sudo-prompt is stubbed in this workspace");
};
