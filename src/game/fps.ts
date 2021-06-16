/**
 * @author mrdoob / http://mrdoob.com/
 */

var Stats = function () {

  var mode = 0;

  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000';
  container.addEventListener('click', function (event) {

    event.preventDefault();
    showPanel(++mode % container.children.length);

  }, false);

  //

  function addPanel(panel: Panel) {

    container.appendChild(panel.dom);
    return panel;

  }

  function showPanel(id: number) {

    for (var i = 0; i < container.children.length; i++) {

      (container.children[i] as HTMLElement).style.display = i === id ? 'block' : 'none';

    }

    mode = id;

  }

  //

  var beginTime = performance.now(), prevTime = beginTime, frames = 0;

  var fpsPanel = addPanel(new Panel('FPS', '#0ff', '#002'));
  var msPanel = addPanel(new Panel('MS', '#0f0', '#020'));

  if ('memory' in self.performance) {

    var memPanel = addPanel(new Panel('MB', '#f08', '#201'));

  }

  showPanel(0);

  return {

    REVISION: 16,

    dom: container,

    addPanel: addPanel,
    showPanel: showPanel,

    begin: function () {

      beginTime = performance.now();

    },

    end: function () {

      frames++;

      var time = performance.now();

      msPanel.update(time - beginTime, 200);

      if (time >= prevTime + 1000) {

        fpsPanel.update((frames * 1000) / (time - prevTime), 100);

        prevTime = time;
        frames = 0;

        if (memPanel && 'memory' in performance) {

          memPanel.update(performance.memory.usedJSHeapSize / 1048576, performance.memory.jsHeapSizeLimit / 1048576);

        }

      }

      return time;

    },

    update: function () {

      beginTime = this.end();

    },

    // Backwards Compatibility

    domElement: container,
    setMode: showPanel

  };

};

var PR = Math.round(window.devicePixelRatio || 1);

var WIDTH = 80 * PR, HEIGHT = 48 * PR,
  TEXT_X = 3 * PR, TEXT_Y = 2 * PR,
  GRAPH_X = 3 * PR, GRAPH_Y = 15 * PR,
  GRAPH_WIDTH = 74 * PR, GRAPH_HEIGHT = 30 * PR;

class Panel {
  min = Infinity;
  max = 0;
  dom: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  name: string;
  fg: string;
  bg: string;

  constructor(name: string, fg: string, bg: string) {
    this.name = name;
    this.fg = fg;
    this.bg = bg;

    var canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = 'width:80px;height:48px';

    var context = canvas.getContext('2d');

    if (!context) throw new Error("oh noes");

    context.font = 'bold ' + (9 * PR) + 'px Helvetica,Arial,sans-serif';
    context.textBaseline = 'top';

    context.fillStyle = bg;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.fillStyle = fg;
    context.fillText(name, TEXT_X, TEXT_Y);
    context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);

    context.fillStyle = bg;
    context.globalAlpha = 0.9;
    context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);

    this.dom = canvas;
    this.context = context;
  }

  update(value: number, maxValue: number) {

    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);

    this.context.fillStyle = this.bg;
    this.context.globalAlpha = 1;
    this.context.fillRect(0, 0, WIDTH, GRAPH_Y);
    this.context.fillStyle = this.fg;
    this.context.fillText(Math.round(value) + ' ' + this.name + ' (' + Math.round(this.min) + '-' + Math.round(this.max) + ')', TEXT_X, TEXT_Y);

    this.context.drawImage(this.dom, GRAPH_X + PR, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT, GRAPH_X, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT);

    this.context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, GRAPH_HEIGHT);

    this.context.fillStyle = this.bg;
    this.context.globalAlpha = 0.9;
    this.context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, Math.round((1 - (value / maxValue)) * GRAPH_HEIGHT));

  }

};

export { Stats as default };

