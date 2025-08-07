import express from 'express';
const router = express.Router();

router.get('/routes', (req, res) => {
    const routes: any[] = [];
    router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: middleware.route.methods
            });
        }
    });
    res.json(routes);
});

export default router;
