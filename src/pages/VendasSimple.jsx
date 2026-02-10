import React from 'react';

function VendasSimple() {
  console.log("Componente VendasSimple sendo renderizado");
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sistema de Vendas (Teste)</h1>
      <p>Se você está vendo esta mensagem, o componente está funcionando!</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p>✅ React funcionando</p>
        <p>✅ Tailwind CSS funcionando</p>
        <p>✅ Componente renderizando</p>
      </div>
    </div>
  );
}

export default VendasSimple;