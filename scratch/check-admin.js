async function test() {
  const res = await fetch('https://admin.beardedmountaineerlodge.com/');
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('Has FO8PA (nuevo build):', text.includes('FO8PAInlR0Dgf-3dRckug'));
  console.log('Has 04xrtam (nuevo CSS):', text.includes('04xrtam57psi5.css'));
  console.log('Has Title:', text.includes('Bearded Mountaineer Lodge'));
}
test();
