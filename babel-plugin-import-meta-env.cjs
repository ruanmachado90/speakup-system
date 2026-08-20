// Babel plugin usado só pelo Jest: o Vite entende `import.meta.env` nativamente
// em runtime/build, mas o Jest roda em Node puro e não sabe o que fazer com
// essa sintaxe. Esse plugin reescreve `import.meta.env` para `process.env`
// antes do teste rodar, então os testes veem valores undefined/falsy em vez
// de quebrar com "Cannot use 'import.meta' outside a module".
module.exports = function importMetaEnvPlugin({ types: t }) {
  return {
    visitor: {
      MemberExpression(path) {
        const { object, property, computed } = path.node;
        if (
          !computed &&
          t.isMetaProperty(object) &&
          object.meta.name === 'import' &&
          object.property.name === 'meta' &&
          property.name === 'env'
        ) {
          path.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('env')));
        }
      },
    },
  };
};
