(function(root) {
  function decision({enabled,auto,comments,editing,hidden,blocked}) {
    if (!enabled) return 'off';
    if (blocked) return 'blocked';
    if (comments || editing) return 'repeat-comments';
    if (hidden) return 'repeat-hidden';
    return auto ? 'next' : 'repeat-manual';
  }
  root.XhsPolicy = {decision};
  if (typeof module !== 'undefined') module.exports = {decision};
})(globalThis);
