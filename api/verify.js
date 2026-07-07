export default async function handler(req, res) {
    // 1. Configure CORS headers to allow your frontend to communicate with this API
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Change '*' to your specific domain later if you want to restrict access
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. Handle CORS Preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Restrict endpoint to POST requests only
    if (req.method !== 'POST') {
        return res.status(405).json({success: false, error: 'Method Not Allowed'});
    }

    try {
        const {code} = req.body;

        // Validate that a code was actually passed
        if (!code) {
            return res.status(400).json({success: false, error: 'Invitation code is required'});
        }

        // 4. GUEST REGISTRY (Your Code Database)
        // You can add, edit, or remove entries here.
        // Keys are converted to uppercase automatically to prevent typos by older relatives.
        const guestDatabase = {
            "": {
                guestName: "",
                customMessage: "",
                allowedGuests: 0
            },
            "koftaNo1": {
                guestName: "وسام سلامة إسماعيل، <br> أمي 🤣",
                customMessage: "بعزمك اهو عشان متقوليش عزمت حماتك و مراتك و عمتك و معزمتنيش🤣🤣🤣",
                allowedGuests: 3
            },
            "Ms.KnowEverything": {
                guestName: "Nour Maged beh",
                customMessage: "ايوا 🤣، بعزمك علي خطوبتك 🥳🥳🥳، متنسيش تجيبي الشبكة بقا",
                allowedGuests: 3
            }
        };

        // Sanitize input: remove accidental spaces and force uppercase
        const cleanCode = code.trim();
        const guestData = guestDatabase[cleanCode];

        // 5. Return Response based on match evaluation
        if (guestData) {
            return res.status(200).json({
                success: true,
                guestName: guestData.guestName,
                customMessage: guestData.customMessage,
                allowedGuests: guestData.allowedGuests
            });
        } else {
            return res.status(404).json({
                success: false,
                error: 'كود الدعوة غير صحيح، يرجى التأكد وإعادة المحاولة'
            });
        }

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({success: false, error: 'Internal Server Error'});
    }
}