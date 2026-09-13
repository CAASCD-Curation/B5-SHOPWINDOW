import React from 'react'

/* 自转玻璃方体橱窗：虹彩半透明材质 + 窗棂网格，持续旋转 */
export default function Cube({ size = 260 }) {
  const half = size / 2
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ]
  return (
    <div className="cube-scene" style={{ width: size, height: size }}>
      <div className="cube">
        {faces.map((t, i) => (
          <div className={`cube__face cube__face--${i}`} key={i} style={{ transform: t }}>
            {/* 窗棂 */}
            <span className="cube__mullion cube__mullion--v" />
            <span className="cube__mullion cube__mullion--h" />
            {/* 雨棚（仅正面） */}
            {i === 0 && <span className="cube__awning" />}
          </div>
        ))}
      </div>
      <div className="cube__shadow" />
    </div>
  )
}
