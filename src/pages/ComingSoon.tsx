import "./ComingSoon.css";

export function ComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon__card">
        <p className="coming-soon__eyebrow">Module à venir</p>
        <h2>{moduleName}</h2>
        <p className="coming-soon__text">
          Ce module sera construit dans une prochaine étape, une fois le
          module Carte terminé.
        </p>
      </div>
    </div>
  );
}
