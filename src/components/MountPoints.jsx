import { memo } from 'react';

/**
 * Conteneurs gérés par le moteur de la plateforme.
 * memo() sans props : React ne re-rend jamais ces nœuds, ce qui évite
 * d'écraser le contenu que le moteur y insère.
 */
function MountPoints() {
  return (
    <>
      <div id="root" />
      <div id="modal-root" />
      <div id="drawer-root" />
      <div id="tour-root" />
      <div id="toast-root" />
    </>
  );
}

export default memo(MountPoints);
