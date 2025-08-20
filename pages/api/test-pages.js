export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'Pages API route working',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}