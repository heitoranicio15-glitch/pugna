import * as THREE from 'three';

const pecas = (id,aco,bronze,couro) => {
  const g=new THREE.Group();
  const add=(geo,mat,y) => {
    const o=new THREE.Mesh(geo,mat); o.position.y=y; g.add(o); return o;
  };
  const barra=(r,h,y,mat=couro) => add(new THREE.CylinderGeometry(r*0.9,r,h,6),mat,y);
  if(id==='lamina') {
    barra(0.038,0.24,-0.025);
    add(new THREE.BoxGeometry(0.2,0.045,0.064),bronze,0.105);
    const lamina=add(new THREE.CylinderGeometry(0.023,0.075,0.49,4),aco,0.366);
    lamina.scale.z=0.36;
    const ponta=add(new THREE.ConeGeometry(0.023,0.16,4),aco,0.691);
    ponta.scale.z=0.36;
  } else if(id==='maca') {
    barra(0.052,1.18,0.41);
    barra(0.084,0.12,0.85,bronze);
    add(new THREE.IcosahedronGeometry(0.22),aco,1.05).scale.y=1.35;
    barra(0.125,0.055,1.28,bronze);
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      const nervura=add(new THREE.BoxGeometry(0.045,0.32,0.095),bronze,1.075);
      nervura.position.x=Math.cos(a)*0.188;
      nervura.position.z=Math.sin(a)*0.188;
      nervura.rotation.y=-a;
    }
  } else if(id==='lanca') {
    barra(0.037,1.73,0.53);
    barra(0.056,0.17,1.375,bronze);
    add(new THREE.ConeGeometry(0.137,0.43,4),aco,1.635).scale.z=0.31;
    barra(0.046,0.12,-0.33,bronze);
  }
  return g;
};

export function modeloDeArma(id,aco,bronze,couro) {
  return pecas(id,aco,bronze,couro);
}

/** Guarda o modelo da espada antiga junto aos substitutos; o punho e os
 * braços de primeira pessoa continuam fora desse seletor. */
export function montarModelosDeArma(punho,espada,mats,giro=0) {
  const armas={espada};
  for(const id of ['lamina','maca','lanca']) {
    const modelo=modeloDeArma(id,...mats);
    modelo.rotation.x=giro; modelo.visible=false;
    punho.add(modelo); armas[id]=modelo;
  }
  return armas;
}

export function mostrarArma(modelos,id) {
  for(const [chave,modelo] of Object.entries(modelos)) modelo.visible=chave===(id ?? 'espada');
}
