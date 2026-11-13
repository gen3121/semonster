// Renders react-icons to PNG (white + navy + pink variants) for icon-in-circle motifs.
const React = require('react');
const RDS = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa6');
const OUT = __dirname + '/assets/ic_';
const names = {
  check: 'FaCircleCheck', play: 'FaCirclePlay', shield: 'FaShieldHeart', camera: 'FaCamera', lock: 'FaUserLock',
  chart: 'FaChartLine', brain: 'FaBrain', scale: 'FaScaleBalanced', bed: 'FaBed', wallet: 'FaWallet',
  list: 'FaListCheck', mobile: 'FaMobileScreen', users: 'FaUsers', flask: 'FaFlask', sign: 'FaFileSignature',
  cal: 'FaCalendarDays', bulb: 'FaLightbulb', warn: 'FaTriangleExclamation', comments: 'FaComments', book: 'FaBookOpen',
  bus: 'FaBus', eye: 'FaEye', sliders: 'FaSliders', dice: 'FaDice', loop: 'FaArrowsRotate', heart: 'FaHeart',
  star: 'FaStar', send: 'FaPaperPlane', db: 'FaDatabase', code: 'FaCode', smile: 'FaFaceSmile', search: 'FaMagnifyingGlass',
  rocket: 'FaRocket', grad: 'FaGraduationCap', mic: 'FaMicrophone', question: 'FaCircleQuestion', clock: 'FaClock',
  pen: 'FaPenToSquare', gear: 'FaGear', handshake: 'FaHandshake', phoneSlash: 'FaBellSlash', hourglass: 'FaHourglassHalf',
  layers: 'FaLayerGroup', target: 'FaBullseye', route: 'FaRoute', user: 'FaUser', userGroup: 'FaUserGroup', stopwatch: 'FaStopwatch',
  bolt: 'FaBolt', mag: 'FaMagnifyingGlassChart', clip: 'FaClipboardCheck', globe: 'FaGlobe', bell: 'FaBell', mirror: 'FaCircleHalfStroke',
  sparkles: 'FaWandMagicSparkles', thumbs: 'FaThumbsUp', compass: 'FaCompass', battery: 'FaBatteryHalf', xmark: 'FaCircleXmark',
};
const colors = { w: '#FFFFFF', n: '#0B3C6E', p: '#E8457C', b: '#0099FF', a: '#F08A24', t: '#12A38A', g: '#7A8594' };
(async () => {
  for (const [k, comp] of Object.entries(names)) {
    if (!fa[comp]) { console.log('missing', comp); continue; }
    for (const [ck, col] of Object.entries(colors)) {
      const svg = RDS.renderToStaticMarkup(React.createElement(fa[comp], { color: col, size: 256 }));
      await sharp(Buffer.from(svg)).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`${OUT}${k}_${ck}.png`);
    }
  }
  console.log('icons done');
})();
