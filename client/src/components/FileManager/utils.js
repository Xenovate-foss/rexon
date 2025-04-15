export const findFileById = (tree, id) => {
  for (const item of tree) {
    if (item.id === id) {
      return item;
    }
    if (item.fileType === "folder" && item.children) {
      const found = findFileById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const updateFileContent = (tree, id, newContent) => {
  return tree.map((item) => {
    if (item.id === id) {
      return { ...item, content: newContent };
    }
    if (item.fileType === "folder" && item.children) {
      return {
        ...item,
        children: updateFileContent(item.children, id, newContent),
      };
    }
    return item;
  });
};
