/* ข้อมูลหลักของเว็บ: สำนักคิด 19 สำนัก และสารสื่อประสาท 6 ชนิด
   (ข้อมูลนักปราชญ์อยู่ใน js/sages.js ซึ่งสร้างจาก project-2)
   ลิงก์ต้นฉบับตรวจแล้วเมื่อ 2026-11-13: เปิดได้ทุกลิงก์ มี 3 ลิงก์ที่หนังสือไม่ตรงสำนัก (ดู warn / alt)
   version และ released ถูกเขียนโดย release.mjs — อย่าแก้ด้วยมือ */
window.JCT = {
  version: '1.7.1',
  released: '2026-11-15',
  sources: {
    gb: 'Project Gutenberg',
    mit: 'MIT Classics',
    ct: 'ctext.org',
    none: 'ยังไม่มีแหล่งต้นฉบับ'
  },
  schools: [
    { id: 's01-existentialism', th: 'อัตถิภาวนิยม', en: 'Existentialism', who: 'Kierkegaard', src: 'gb', url: 'https://www.gutenberg.org/ebooks/60333' },
    { id: 's02-nihilism', th: 'สูญนิยม', en: 'Nihilism', who: 'Friedrich Nietzsche', src: 'gb', url: 'https://www.gutenberg.org/ebooks/1998' },
    { id: 's03-absurdism', th: 'เหลวไหลนิยม', en: 'Absurdism', who: 'Albert Camus', src: 'none', url: '' },
    { id: 's04-theism', th: 'เทวนิยม', en: 'Theism', who: 'โสเครตีส, เพลโต', src: 'gb', url: 'https://www.gutenberg.org/ebooks/17611', warn: 'ลิงก์นี้คือ Summa Theologica ของโทมัส อไควนัส ไม่ใช่งานของโสเครตีสหรือเพลโต', alt: [{ t: 'Plato — Apology', url: 'https://www.gutenberg.org/ebooks/1656' }, { t: 'Plato — Phaedo', url: 'https://www.gutenberg.org/ebooks/1658' }, { t: 'Plato — The Republic', url: 'https://www.gutenberg.org/ebooks/1497' }] },
    { id: 's05-hedonism', th: 'สุขนิยม', en: 'Hedonism', who: 'Epicurus, Aristippus แห่งไซรีน', src: 'mit', url: 'https://classics.mit.edu/Epicurus/princdoc.html' },
    { id: 's06-utilitarianism', th: 'ประโยชน์นิยม', en: 'Utilitarianism', who: 'Jeremy Bentham, John Stuart Mill', src: 'gb', url: 'https://www.gutenberg.org/ebooks/11224', warn: 'เล่มนี้เป็นงานของมิลล์เท่านั้น ไม่มีงานของเบนแธม' },
    { id: 's07-virtue', th: 'คุณธรรมนิยม', en: 'Virtue ethics', who: 'โสเครตีส, เพลโต, อริสโตเติล', src: 'mit', url: 'https://classics.mit.edu/Aristotle/nicomachaen.html' },
    { id: 's08-stoicism', th: 'สันโดษนิยม', en: 'Stoicism', who: 'Zeno แห่งซิเทียม', src: 'mit', url: 'https://classics.mit.edu/Epictetus/epicench.html', warn: 'ต้นฉบับที่ลิงก์ไว้คือ Enchiridion ของเอพิกเททัส งานของเซโนเองสูญหายแล้ว' },
    { id: 's09-daoism', th: 'ลัทธิเต๋า', en: 'Daoism', who: 'Laozi', src: 'ct', url: 'https://ctext.org/dao-de-jing' },
    { id: 's10-pragmatism', th: 'ปฏิบัตินิยม', en: 'Pragmatism', who: 'C. S. Peirce, William James, John Dewey', src: 'gb', url: 'https://www.gutenberg.org/ebooks/5116', alt: [{ t: 'Dewey — Democracy and Education', url: 'https://www.gutenberg.org/ebooks/852' }] },
    { id: 's11-humanism', th: 'มนุษย์นิยม', en: 'Humanism', who: 'Petrarca, Protagoras', src: 'gb', url: 'https://www.gutenberg.org/ebooks/9371', warn: 'ลิงก์นี้คือ The Praise of Folly ของเอราสมุส ไม่ใช่งานของเปตราร์กาหรือโพรทาโกรัส', alt: [{ t: 'Plato — Protagoras', url: 'https://www.gutenberg.org/ebooks/1591' }] },
    { id: 's12-determinism', th: 'กำหนดนิยม', en: 'Determinism', who: 'Leucippus, Democritus, Spinoza', src: 'gb', url: 'https://www.gutenberg.org/ebooks/3800' },
    { id: 's13-individualism', th: 'เอกัตนิยม', en: 'Individualism', who: 'John Locke, Ayn Rand', src: 'gb', url: 'https://www.gutenberg.org/ebooks/7370' },
    { id: 's14-serenity', th: 'สงบนิยม', en: 'Serenity (Buddhism)', who: 'พุทธศาสนา', src: 'gb', url: 'https://www.gutenberg.org/ebooks/4602', warn: 'ลิงก์นี้คือ The Kingdom of God Is Within You ของตอลสตอย ไม่ใช่คัมภีร์พุทธ', alt: [{ t: 'Dhammapada', url: 'https://www.gutenberg.org/ebooks/2017' }, { t: 'The Gospel of Buddha', url: 'https://www.gutenberg.org/ebooks/35895' }] },
    { id: 's15-naturalism', th: 'เทพาธรรมชาตินิยม', en: 'Pantheistic naturalism', who: 'Baruch Spinoza', src: 'gb', url: 'https://www.gutenberg.org/ebooks/3800' },
    { id: 's16-subjectivism', th: 'อัตวิสัยนิยม', en: 'Subjectivism', who: 'Protagoras, René Descartes', src: 'gb', url: 'https://www.gutenberg.org/ebooks/59' },
    { id: 's17-optimism', th: 'สุขสันตินิยม', en: 'Optimism', who: 'Gottfried Wilhelm Leibniz', src: 'gb', url: 'https://www.gutenberg.org/ebooks/17147' },
    { id: 's18-liberalism', th: 'เสรีนิยม', en: 'Liberalism', who: 'John Locke', src: 'gb', url: 'https://www.gutenberg.org/ebooks/7370' },
    { id: 's19-confucianism', th: 'ลัทธิขงจื๊อ', en: 'Confucianism', who: 'ขงจื๊อ', src: 'ct', url: 'https://ctext.org/analects' }
  ],
  neuro: [
    {
      id: 'dopamine', th: 'โดปามีน', en: 'Dopamine',
      role: 'เกี่ยวข้องกับแรงจูงใจ รางวัล และการควบคุมการเคลื่อนไหว',
      where: 'สร้างที่สมองส่วนกลาง (substantia nigra และ ventral tegmental area) ส่งไปยัง striatum, nucleus accumbens และคอร์เทกซ์ส่วนหน้า',
      note: 'การสูญเสียเซลล์ใน substantia nigra เกี่ยวข้องกับโรคพาร์กินสัน'
    },
    {
      id: 'serotonin', th: 'เซโรโทนิน', en: 'Serotonin',
      role: 'เกี่ยวข้องกับอารมณ์ การนอน และความอยากอาหาร',
      where: 'สร้างที่ raphe nuclei ในก้านสมอง แล้วส่งใยประสาทกระจายไปทั่วสมอง',
      note: 'ยากลุ่ม SSRI ออกฤทธิ์โดยเพิ่มปริมาณเซโรโทนินในรอยต่อประสาท'
    },
    {
      id: 'norepinephrine', th: 'นอร์เอพิเนฟริน', en: 'Norepinephrine',
      role: 'เกี่ยวข้องกับความตื่นตัว สมาธิ และการตอบสนองต่อความเครียด',
      where: 'สร้างที่ locus coeruleus ใน pons แล้วส่งไปทั่วคอร์เทกซ์และสมองส่วนอื่น',
      note: 'ยากลุ่มกระตุ้นสมาธิหลายตัวออกฤทธิ์ผ่านระบบนี้'
    },
    {
      id: 'acetylcholine', th: 'อะเซทิลโคลีน', en: 'Acetylcholine',
      role: 'เกี่ยวข้องกับความจำ ความตั้งใจ และการสั่งงานกล้ามเนื้อ',
      where: 'ในสมองมาจาก basal forebrain และก้านสมอง ส่งไปคอร์เทกซ์และ hippocampus',
      note: 'การเสื่อมของเซลล์ cholinergic เกี่ยวข้องกับโรคอัลไซเมอร์'
    },
    {
      id: 'glutamate', th: 'กลูตาเมต', en: 'Glutamate',
      role: 'ตัวกระตุ้นหลักของสมอง สำคัญต่อการเรียนรู้และความจำ',
      where: 'ใช้โดยเซลล์ประสาทกระตุ้นจำนวนมากทั่วคอร์เทกซ์และ hippocampus',
      note: 'การปรับความแรงของไซแนปส์ที่ใช้กลูตาเมตเป็นพื้นฐานของการเรียนรู้'
    },
    {
      id: 'gaba', th: 'GABA', en: 'GABA',
      role: 'ตัวยับยั้งหลักของสมอง ช่วยลดการส่งสัญญาณของเซลล์ประสาท',
      where: 'ใช้โดยเซลล์ประสาทยับยั้ง (interneuron) กระจายทั่วสมอง',
      note: 'ยากลุ่ม benzodiazepine เพิ่มฤทธิ์ของ GABA ที่ตัวรับ GABA-A'
    }
  ]
};
