import dat from "dat.gui";

interface Refs {
  updateKeywords: () => void,
}

export default function startGUI(config: any, { updateKeywords }: Refs) {
  var gui = new dat.GUI({ width: 300 });
  gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
  gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
  gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');
  gui.add(config, 'CURL', 0, 50).name('vorticity').step(1);
  gui.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
  gui.add(config, 'SHADING').name('shading').onFinishChange(updateKeywords);
  gui.add(config, 'COLORFUL').name('colorful');
  gui.add(config, 'PAUSED').name('paused').listen();

  let bloomFolder = gui.addFolder('Bloom');
  bloomFolder.add(config, 'BLOOM').name('enabled').onFinishChange(updateKeywords);
  bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
  bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');

  let sunraysFolder = gui.addFolder('Sunrays');
  sunraysFolder.add(config, 'SUNRAYS').name('enabled').onFinishChange(updateKeywords);
  sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');

  gui.close();
}

export function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}