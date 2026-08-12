import React from 'react';

export default function BgShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* === CANTO SUPERIOR ESQUERDO === */}
      {/* Círculo azul no topo */}
      <div
        className="absolute"
        style={{ top: '-60px', left: '-40px', width: '220px', height: '220px', background: '#1E3A8A', borderRadius: '50%' }}
      />
      {/* Círculo laranja pequeno */}
      <div
        className="absolute"
        style={{ top: '155px', left: '28px', width: '72px', height: '72px', background: '#E8490A', borderRadius: '50%' }}
      />
      {/* Píula verde */}
      <div
        className="absolute"
        style={{ top: '185px', left: '55px', width: '58px', height: '145px', background: '#1A6B3A', borderRadius: '999px' }}
      />

      {/* === CANTO INFERIOR ESQUERDO === */}
      {/* Retângulo vermelho arredondado */}
      <div
        className="absolute"
        style={{ bottom: '-30px', left: '-10px', width: '200px', height: '175px', background: '#C0252B', borderRadius: '32px 32px 0 0' }}
      />
      {/* Semicírculo amarelo */}
      <div
        className="absolute"
        style={{ bottom: '-30px', left: '168px', width: '95px', height: '80px', background: '#E8A920', borderRadius: '999px 999px 0 0' }}
      />

      {/* === CANTO SUPERIOR DIREITO === */}
      {/* Retângulo laranja no topo */}
      <div
        className="absolute"
        style={{ top: '-20px', right: '-20px', width: '235px', height: '165px', background: '#E8490A', borderRadius: '0 0 0 40px' }}
      />
      {/* Círculo azul menor */}
      <div
        className="absolute"
        style={{ top: '110px', right: '30px', width: '90px', height: '90px', background: '#1E3A8A', borderRadius: '50%' }}
      />

      {/* === CANTO INFERIOR DIREITO === */}
      {/* Semicírculo amarelo grande */}
      <div
        className="absolute"
        style={{ bottom: '-20px', right: '105px', width: '210px', height: '110px', background: '#E8A920', borderRadius: '999px 999px 0 0' }}
      />
      {/* Píula verde */}
      <div
        className="absolute"
        style={{ bottom: '75px', right: '22px', width: '55px', height: '140px', background: '#1A6B3A', borderRadius: '999px' }}
      />
      {/* Círculo azul */}
      <div
        className="absolute"
        style={{ bottom: '-30px', right: '55px', width: '145px', height: '145px', background: '#1E3A8A', borderRadius: '50%' }}
      />
      {/* Círculo vermelho pequeno */}
      <div
        className="absolute"
        style={{ bottom: '-10px', right: '105px', width: '65px', height: '65px', background: '#C0252B', borderRadius: '50%' }}
      />
    </div>
  );
}
