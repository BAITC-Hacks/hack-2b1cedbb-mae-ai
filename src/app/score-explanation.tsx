export function ScoreExplanation({ penalty }: { penalty: number }) {
  return (
    <div className="score-explanation">
      {penalty > 0 && (
        <p className="imbalance-penalty">Штраф за дисбаланс: -{penalty.toFixed(1)}</p>
      )}
      <details className="score-details">
        <summary>Как рассчитывается индекс?</summary>
        <div className="score-details-content">
          <p>Индекс качества жизни рассчитывается на основе пяти показателей:</p>
          <ul>
            <li>Мобильность — 20%</li>
            <li>Экология — 20%</li>
            <li>Социальная сфера — 20%</li>
            <li>Безопасность — 20%</li>
            <li>Городские сервисы — 20%</li>
          </ul>
          <p>При сильном дисбалансе между направлениями применяется штраф до 8 баллов.</p>
          <p>Это виртуальная модель симуляции и не является официальной оценкой города или прогнозом последствий реальных решений.</p>
        </div>
      </details>
    </div>
  );
}
