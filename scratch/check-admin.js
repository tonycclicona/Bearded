async function test() {
  const res = await fetch('https://admin.beardedmountaineerlodge.com/');
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('Has 8Q5HL3:', text.includes('8Q5HL3-H2oiqB_MCT2HeF'));
  console.log('Has PRK5F:', text.includes('PRK5F-fHvOtl8aW55UX0_'));
  console.log('Snippet:', text.substring(0, 300));
}
test();
