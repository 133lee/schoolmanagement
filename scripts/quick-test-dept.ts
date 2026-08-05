async function quickTest() {
  // Login first
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@school.zm",
      password: "Admin123!",
    }),
  });

  const loginData = await loginRes.json();
  const token = loginData.data.token;

  console.log("Token obtained:", token.substring(0, 20) + "...");

  // Now test departments endpoint
  const deptRes = await fetch(
    "http://localhost:3000/api/departments?page=1&pageSize=5",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const deptData = await deptRes.json();
  console.log("Department Response Status:", deptRes.status);
  console.log("Department Response:", JSON.stringify(deptData, null, 2));
}

quickTest();
