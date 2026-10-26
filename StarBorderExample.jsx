import React from 'react';
import StarBorder from './StarBorder';

export function StarBorderExample() {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '2rem', background: '#0a0e17' }}>
      {/* 1. Botão de Ação Primária com Glow Ciano */}
      <StarBorder
        as="a"
        href="#projetos"
        color="#38bdf8"
        trailColor="#0284c7"
        duration={3.5}
        direction="clockwise"
        stars={1}
        trailLength={0.32}
        thickness={1.2}
        radius={10}
        glow={0.8}
        hover="lap"
        sparkle={true}
        clickPulse={true}
        theme="dark"
      >
        Ver meus projetos
      </StarBorder>

      {/* 2. Botão Secundário com Glow Suave */}
      <StarBorder
        as="a"
        href="#contato"
        color="#94a3b8"
        trailColor="#38bdf8"
        duration={4.0}
        direction="clockwise"
        stars={1}
        trailLength={0.3}
        thickness={1}
        radius={10}
        glow={0.6}
        hover="lap"
        sparkle={true}
        clickPulse={true}
        theme="dark"
      >
        Entrar em contato
      </StarBorder>
    </div>
  );
}

export default StarBorderExample;
