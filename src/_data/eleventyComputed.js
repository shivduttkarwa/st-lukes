export default {
  p: (data) => (data.pageKey ? data.pages[data.pageKey] : null),
};
