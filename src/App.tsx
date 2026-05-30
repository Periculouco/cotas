import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Heart, X, MapPin, AlertCircle, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "./config/supabaseClient";
import { resolvePixGateway, PIX_GATEWAY_FUNCTION, PARADISE_API_KEY, PARADISE_PRODUCT_HASH, PIXZY_API_TOKEN, UTMIFY_API_TOKEN } from "./config/pixGateway";

// Global Configuration matching script.js
const IMAGE_BASE_URL = "https://resgauteoficial.org";

export default function App() {
  // Carousels State
  const [currentAbout, setCurrentAbout] = useState(0);
  const [currentTrans, setCurrentTrans] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Modals Visibility
  const [isCnpjModalOpen, setIsCnpjModalOpen] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isExitPopupOpen, setIsExitPopupOpen] = useState(false);

  // Donation Flow State
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationType, setDonationType] = useState<"unica" | "mensal">("unica");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(20);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donationStep, setDonationStep] = useState<1 | 2 | 3 | 4 | 5>(1); // 1: Choose, 2: Info, 3: Loading, 4: QR Display, 5: Success

  // User input states
  const [donorPhone, setDonorPhone] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorCpf, setDonorCpf] = useState("");
  const [addAdminFee, setAddAdminFee] = useState(false);

  // Checkout API states
  const [pixCode, setPixCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [gatewayUsed, setGatewayUsed] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [errorMessage, setErrorMessage] = useState("");

  // Polling ref to clear interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Copied State for standard feedback
  const [copiedPix, setCopiedPix] = useState(false);

  // Tracking details
  const [utms, setUtms] = useState<Record<string, string>>({});

  // Send order tracking to Utmify
  const sendUtmifyTracking = async (orderId: string, status: "waiting_payment" | "paid", amountCents: number) => {
    if (!UTMIFY_API_TOKEN) {
      console.log("Utmify API token not set. Skipping tracking.");
      return;
    }

    try {
      const formatUtcDate = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
      };

      const now = new Date();
      const createdAtStr = formatUtcDate(now);
      const approvedDateStr = status === "paid" ? createdAtStr : null;

      const cleanPhone = donorPhone ? donorPhone.replace(/\D/g, "") : null;
      const cleanDocument = donorCpf ? donorCpf.replace(/\D/g, "") : null;

      const name = donorName || "Doador Anonimo";
      const email = donorEmail || `${name.toLowerCase().replace(/\s+/g, "")}@cotas.org`;

      const orderPayload = {
        orderId: orderId,
        platform: "Cotas",
        paymentMethod: "pix",
        status: status,
        createdAt: createdAtStr,
        approvedDate: approvedDateStr,
        refundedAt: null,
        customer: {
          name: name,
          email: email,
          phone: cleanPhone,
          document: cleanDocument,
          country: "BR"
        },
        products: [
          {
            id: "cotas",
            name: "Cotas",
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: amountCents
          }
        ],
        trackingParameters: {
          src: utms.src || null,
          sck: utms.sck || null,
          utm_source: utms.utm_source || null,
          utm_campaign: utms.utm_campaign || null,
          utm_medium: utms.utm_medium || null,
          utm_content: utms.utm_content || null,
          utm_term: utms.utm_term || null
        },
        commission: {
          totalPriceInCents: amountCents,
          gatewayFeeInCents: 0,
          userCommissionInCents: amountCents
        },
        isTest: false
      };

      console.log(`Invoking send-utmify-order with status: ${status}`);
      const { data, error } = await supabase.functions.invoke("send-utmify-order", {
        body: {
          orderPayload,
          apiToken: UTMIFY_API_TOKEN
        }
      });

      if (error) throw error;
      console.log("Utmify tracking response:", data);
    } catch (err) {
      console.error("Failed to send Utmify tracking:", err);
    }
  };

  // Capture UTM parameters and Vturb Video on load
  useEffect(() => {
    // 1. Capture UTM parameters
    const urlParams = new URLSearchParams(window.location.search);
    const trackedParams: Record<string, string> = {};
    ["utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "src", "sck"].forEach((param) => {
      const val = urlParams.get(param);
      if (val) trackedParams[param] = val;
    });
    setUtms(trackedParams);

    // 2. Load Vturb Player SDK script dynamically
    const script = document.createElement("script");
    script.src = "https://scripts.converteai.net/lib/js/smartplayer-wc/v4/sdk.js";
    script.async = true;
    document.head.appendChild(script);

    // Set dynamic iframe source
    if (iframeRef.current) {
      iframeRef.current.src =
        "https://scripts.converteai.net/ceb98e0d-78d9-4f17-bb64-9c9172800038/players/6a1b068d703894749f3c82e9/v4/embed.html" +
        (window.location.search || "?") +
        "&vl=" +
        encodeURIComponent(window.location.href);
    }

    // 3. Autoplay About carousel
    const interval = setInterval(() => {
      setCurrentAbout((prev) => (prev + 1) % 3);
    }, 8000);

    return () => {
      document.head.removeChild(script);
      clearInterval(interval);
    };
  }, []);

  // Exit intent and back redirect handler
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsExitPopupOpen(true);
      }
    };

    const handlePopState = () => {
      setIsExitPopupOpen(true);
      window.history.pushState(null, "", window.location.href);
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("popstate", handlePopState);
    
    // Push initial history state to intercept the first back click
    window.history.pushState(null, "", window.location.href);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Polling transaction status when step 4 is active
  useEffect(() => {
    if (donationStep === 4 && transactionId) {
      setPaymentStatus("pending");
      
      const pollGateway = resolvePixGateway();

      pollingIntervalRef.current = setInterval(async () => {
        try {
          if (pollGateway === "pixzy") {
            // Polling Pixzy status directly via check-pix-status (no database dependency)
            const { data, error } = await supabase.functions.invoke(
              `check-pix-status?transaction_id=${transactionId}&gateway=pixzy&apiToken=${PIXZY_API_TOKEN}`,
              { method: "GET" }
            );
            if (error) throw error;
            
            console.log("Polling Pixzy status via check-pix-status:", data);
            if (data?.status === "paid" || data?.status === "approved") {
              setPaymentStatus("paid");
              setDonationStep(5);
              sendUtmifyTracking(transactionId, "paid", Math.round(getFinalAmount() * 100));
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            } else if (data?.status === "expired" || data?.status === "failed" || data?.status === "canceled") {
              setPaymentStatus(data.status);
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            }
          } else {
            // Polling Paradise status directly via check-pix-status (no database dependency)
            const { data, error } = await supabase.functions.invoke(
              `check-pix-status?transaction_id=${transactionId}&gateway=paradise&apiKey=${PARADISE_API_KEY}&external_ref=${transactionId}`,
              { method: "GET" }
            );
            if (error) throw error;

            console.log("Polling Paradise status via check-pix-status:", data);
            if (data?.status === "paid" || data?.status === "approved") {
              setPaymentStatus("paid");
              setDonationStep(5);
              sendUtmifyTracking(transactionId, "paid", Math.round(getFinalAmount() * 100));
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            } else if (data?.status === "expired" || data?.status === "canceled") {
              setPaymentStatus(data.status);
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            }
          }
        } catch (err) {
          console.error("Error polling payment status:", err);
        }
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [donationStep, transactionId]);

  // Copy standard handlers
  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Carousel Next/Prev Handlers
  const nextAbout = () => setCurrentAbout((prev) => (prev + 1) % 3);
  const prevAbout = () => setCurrentAbout((prev) => (prev === 0 ? 2 : prev - 1));

  const nextTrans = () => setCurrentTrans((prev) => (prev + 1) % 8);
  const prevTrans = () => setCurrentTrans((prev) => (prev === 0 ? 7 : prev - 1));

  const nextTestimonial = () => setCurrentTestimonial((prev) => (prev + 1) % 8);
  const prevTestimonial = () => setCurrentTestimonial((prev) => (prev === 0 ? 7 : prev - 1));

  // Modal actions
  const openDonationModal = () => {
    setIsDonationModalOpen(true);
    setDonationStep(1);
    setSelectedAmount(20);
    setCustomAmount("");
    setDonorPhone("");
    setDonorName("");
    setDonorEmail("");
    setDonorCpf("");
    setAddAdminFee(false);
  };

  const closeDonationModal = () => {
    setIsDonationModalOpen(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleRedirectToSpecialOffer = () => {
    setIsExitPopupOpen(false);
    openDonationModal();
  };

  // Form helpers
  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedAmount(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const getFinalAmount = () => {
    const base = selectedAmount !== null ? selectedAmount : Number(customAmount) || 0;
    if (donationType === "unica" && addAdminFee) {
      return base + 6.99;
    }
    return base;
  };

  const handleStep1Submit = () => {
    const amount = getFinalAmount();
    if (amount <= 0) {
      alert("Por favor, escolha ou digite um valor válido.");
      return;
    }
    if (amount > 15000) {
      alert("O valor máximo para doação é de R$ 15.000.");
      return;
    }
    setDonationStep(2);
  };

  const generateContribution = async () => {
    // Validate inputs
    let name = "Anonimo";
    let phone = donorPhone.replace(/\D/g, "");
    let email = donorEmail.trim();
    let cpf = donorCpf.replace(/\D/g, "");

    if (donationType === "mensal") {
      if (!donorName.trim()) {
        alert("Por favor, preencha seu nome completo.");
        return;
      }
      if (phone.length < 10) {
        alert("Por favor, preencha um telefone válido.");
        return;
      }
      if (cpf.length !== 11) {
        alert("Por favor, preencha um CPF válido.");
        return;
      }
      name = donorName;
      if (!email) {
        email = `${name.toLowerCase().replace(/\s+/g, "")}@cotas.org`;
      }
    } else {
      if (!phone) {
        phone = "00000000000";
      }
    }

    setDonationStep(3); // Loading screen
    setErrorMessage("");

    try {
      const finalAmountCents = Math.round(getFinalAmount() * 100);
      const gw = resolvePixGateway();
      const functionName = PIX_GATEWAY_FUNCTION[gw];

      console.log(`Invoking Edge Function: ${functionName} using gateway: ${gw}`);

      const payload: any = {
        amount: finalAmountCents,
        customer: {
          name: name,
          email: email || `${name.toLowerCase().replace(/\s+/g, "")}@cotas.org`,
          phone: phone,
          document: cpf || "00000000000",
        },
        tracking: utms,
      };

      if (gw === "paradise") {
        payload.apiKey = PARADISE_API_KEY;
        payload.productHash = PARADISE_PRODUCT_HASH;
      } else if (gw === "pixzy") {
        payload.apiToken = PIXZY_API_TOKEN;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || "Ocorreu um erro ao gerar o pagamento.");
      }

      // Save payment credentials
      setPixCode(data.pixCode);
      setGatewayUsed(data.gateway);
      setTransactionId(data.transactionId);

      // Generate local QR Code if base64 is empty
      if (data.qrcodeBase64) {
        setQrCodeBase64(data.qrcodeBase64);
      } else {
        const generatedBase64 = await QRCode.toDataURL(data.pixCode);
        setQrCodeBase64(generatedBase64);
      }

      // Trigger Utmify tracking for waiting_payment
      sendUtmifyTracking(data.transactionId, "waiting_payment", finalAmountCents);

      setDonationStep(4); // Show QR screen
    } catch (err: any) {
      console.error("Payment generation error:", err);
      setErrorMessage(err.message || "Falha na conexão com o servidor. Tente novamente.");
      setDonationStep(2); // Fall back to details
    }
  };

  return (
    <div className="site-wrapper">
      {/* Banner Principal */}
      <section className="banner-section">
        <div className="banner-container">
          <img
            src={`${IMAGE_BASE_URL}/imagens/bannerajude.webp`}
            alt="Resgaute - Mais de 160 vidas abandonadas e esquecidas dependem de você!"
            className="banner-image"
          />
        </div>
      </section>

      <main className="main-content">
        {/* Seção do Vídeo VSL */}
        <section className="video-section">
          <div className="container">
            <div className="video-wrapper">
              <div id="ifr_6a1b068d703894749f3c82e9_wrapper" style={{ margin: "0 auto", width: "100%", maxWidth: "400px" }}>
                <div style={{ position: "relative", padding: "178.21782178217822% 0 0 0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }} id="ifr_6a1b068d703894749f3c82e9_aspect">
                  <iframe
                    ref={iframeRef}
                    frameBorder="0"
                    allowFullScreen
                    src="about:blank"
                    id="ifr_6a1b068d703894749f3c82e9"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                    referrerPolicy="origin"
                    title="VSL Video Player"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <button className="transformation-cta-btn pulse-animation" onClick={openDonationModal}>
              QUERO AJUDAR
            </button>
          </div>
        </section>

        {/* Seção Entenda Nosso Propósito */}
        <section className="save-shelter-section" id="ajude-o-abrigo">
          <div className="container">
            <h2 className="section-title">Entenda Nosso Propósito</h2>
            <div className="banner2-container">
              <img
                src={`${IMAGE_BASE_URL}/imagens/bannerresgaute.webp`}
                alt="Salve o Abrigo"
                className="banner2-image"
              />
            </div>
            <div className="save-message">
              <div className="save-story">
                <span className="save-story-label">Da inocência ao resgate</span>
                <p className="save-story-text">
                  Me chamo Luana e desde criança tenho uma grande paixão pelos animais. Há quatro anos, dei vida ao Projeto Resgaute, uma missão de amor e esperança. Com fé em Deus e com o apoio de pessoas incríveis como você, já salvamos mais de <span className="highlight-number">4.500</span> vidas. 🐾
                </p>
              </div>
              <div className="save-spotlight">
                <div className="save-spotlight-card">
                  <span className="save-spotlight-title">🐶 +4.500 vidas</span>
                </div>
                <div className="save-spotlight-card">
                  <span className="save-spotlight-title">♥️ 500 animais</span>
                </div>
              </div>
              <div className="save-story-footnote">
                <p>
                  Hoje, mais de <span className="highlight-number">500</span> animais resgatados dependem do nosso abrigo para não passar fome, receber cuidados e ter uma nova chance de ser feliz.
                </p>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "30px" }}>
              <button className="transformation-cta-btn pulse-animation" onClick={openDonationModal}>
                QUERO AJUDAR
              </button>
            </div>
          </div>
        </section>

        {/* Seção Ajude o Abrigo Carousel */}
        <section className="about-section">
          <div className="container">
            <h2 className="section-title">Ajude o Abrigo</h2>

            <div className="about-carousel" id="aboutCarousel">
              {/* Slide 1 */}
              <div className={`about-slide ${currentAbout === 0 ? "active" : ""}`}>
                <div className="about-slide-content">
                  <div className="about-slide-image">
                    <img src={`${IMAGE_BASE_URL}/imagens/proposito/proposito1.webp`} alt="Nossa História" />
                  </div>
                  <div className="about-slide-text">
                    <h3>NOSSA HISTÓRIA</h3>
                    <p>
                      Há mais de quatro anos, o Resgaute dedica sua vida a salvar cães abandonados. Hoje, mais de 500 animais têm um lar seguro!
                    </p>
                  </div>
                </div>
              </div>

              {/* Slide 2 */}
              <div className={`about-slide ${currentAbout === 1 ? "active" : ""}`}>
                <div className="about-slide-content">
                  <div className="about-slide-image">
                    <img src={`${IMAGE_BASE_URL}/imagens/proposito/proposito2.webp`} alt="Espaço e Obra" />
                  </div>
                  <div className="about-slide-text">
                    <h3>SALVE UMA VIDA</h3>
                    <p>
                      Cada doação ajuda a crescer o abrigo e dar mais conforto e segurança para os animais que dependem de nós.
                    </p>
                  </div>
                </div>
              </div>

              {/* Slide 3 */}
              <div className={`about-slide ${currentAbout === 2 ? "active" : ""}`}>
                <div className="about-slide-content">
                  <div className="about-slide-image">
                    <img src={`${IMAGE_BASE_URL}/imagens/proposito/proposito3.webp`} alt="Custos e Doações" />
                  </div>
                  <div className="about-slide-text">
                    <h3>APOIO E ESPERANÇA</h3>
                    <p>
                      Manter mais de 500 vidas exige alimento, cuidados veterinários e abrigo todos os dias. Sua ajuda mantém essa missão viva.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controles do carrossel */}
            <div className="about-controls">
              <button className="about-btn prev" onClick={prevAbout}>‹</button>
              <div className="about-indicators">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`about-indicator ${currentAbout === i ? "active" : ""}`}
                    onClick={() => setCurrentAbout(i)}
                  ></span>
                ))}
              </div>
              <button className="about-btn next" onClick={nextAbout}>›</button>
            </div>
          </div>
        </section>

        {/* Seção Impacto da Ajuda */}
        <section className="impact-donation-section">
          <div className="container">
            <h2 className="section-title">O impacto da sua ajuda</h2>
            <div className="impact-section">
              <div className="impact-grid">
                <div className="impact-item">
                  <span className="impact-value">🩵 R$ 25</span>
                  <span className="impact-description">Uma semana de alimento e esperança para um animal.</span>
                </div>
                <div className="impact-item">
                  <span className="impact-value">🩵 R$ 50</span>
                  <span className="impact-description">Saúde e nutrição para 2 animais durante 10 dias.</span>
                </div>
                <div className="impact-item">
                  <span className="impact-value">🩵 R$ 100</span>
                  <span className="impact-description">Um saco de ração de 10kg, o suficiente para alimentar 5 vidas por 30 dias.</span>
                </div>
                <div className="impact-item">
                  <span className="impact-value">🩵 R$ 200</span>
                  <span className="impact-description">Vacinas e vermífugos que protegem 4 animais contra doenças.</span>
                </div>
                <div className="impact-item">
                  <span className="impact-value">🩵 R$ 500</span>
                  <span className="impact-description">Tratamento completo e digno por um mês para 3 animais.</span>
                </div>
                <div className="impact-item">
                  <span className="impact-value">🩵 R$ 1.000</span>
                  <span className="impact-description">Cirurgias de urgência e recuperação de animais em estado crítico.</span>
                </div>
              </div>
              <p className="impact-footer">Toda doação é um ato de amor. 🐾</p>
            </div>
          </div>
        </section>


        {/* Seção Histórias de Transformação Carousel */}
        <section className="new-transformation-section">
          <div className="container">
            <h2 className="section-title">Histórias de Transformação</h2>
            <p className="new-transformation-subtitle">
              Estas são algumas das centenas de animais que conseguimos resgatar e reabilitar graças ao seu apoio.
            </p>

            <div className="new-transformation-carousel" id="newTransformationCarousel">
              {[9, 8, 7, 6, 5, 3, 2, 1].map((num, i) => (
                <div key={num} className={`new-transformation-item ${currentTrans === i ? "active" : ""}`}>
                  <div className="new-transformation-card">
                    <div className="new-transformation-image">
                      <img
                        src={`${IMAGE_BASE_URL}/imagens/trans/trans${num}.webp`}
                        alt={`Transformação ${num}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles do carrossel */}
            <div className="new-transformation-controls">
              <button className="new-transformation-btn prev" onClick={prevTrans}>‹</button>
              <div className="new-transformation-indicators" id="newTransformationIndicators">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className={`new-transformation-indicator ${currentTrans === i ? "active" : ""}`}
                    onClick={() => setCurrentTrans(i)}
                  ></div>
                ))}
              </div>
              <button className="new-transformation-btn next" onClick={nextTrans}>›</button>
            </div>
          </div>
        </section>

        {/* Seção de Depoimentos */}
        <section className="new-testimonials-section">
          <div className="container">
            <h2 className="section-title">Adoção que transforma vidas</h2>

            <div className="new-testimonials-carousel" id="newTestimonialsCarousel">
              {[
                { name: "Gustavo Martins", pet: "Simba", img: 8, text: ' "O Simba é incrível! Ele passou por muito, mas hoje é pura felicidade. Ver essa transformação só me faz agradecer ao Resgaute todos os dias! 🙏" ' },
                { name: "Beatriz Costa", pet: "Lola", img: 7, text: ' "A Lola trouxe alegria para toda a família! Ela é carinhosa, brincalhona e cheia de amor. Adotar foi a decisão mais bonita que já fizemos. 💕" ' },
                { name: "Marcos Almeida", pet: "Rex", img: 6, text: ' "Rex é meu melhor amigo! Ele estava em péssimas condições e hoje é um cão saudável e feliz. O Resgaute faz um trabalho incrível. Muito obrigado!" ' },
                { name: "Julian Ferreira", pet: "Mel", img: 5, text: ' "A Mel é tudo pra mim! Ela estava desnutrida e hoje é uma cachorrinha feliz e saudável. Adotar salvou duas vidas: a dela e a minha. ❤️" ' },
                { name: "Jessica Lima", pet: "Bob", img: 4, text: ' "O Bob é pura alegria! Adotá-lo foi receber um presente de amor incondicional. O trabalho do Resgaute é simplesmente inspirador. Recomendo a todos!" ' },
                { name: "Camila Oliveira", pet: "Nina", img: 3, text: ' "A Nina chegou assustada e hoje é a companheira mais amorosa. Ela trouxe luz para nossa família. Adotar é um ato de amor que transforma vidas!" ' },
                { name: "Felipe Santos", pet: "Thor", img: 2, text: ' "O Thor transformou minha vida! Ele é protetor, carinhoso e cheio de energia. Não consigo imaginar meus dias sem ele. Gratidão eterna ao Resgaute!" ' },
                { name: "Amanda Rodrigues", pet: "Belinha", img: 1, text: ' "Adotar a Belinha foi a melhor decisão que já tomei! Ela chegou com medo, mas hoje é a rainha da casa. Obrigada Resgaute por me dar essa alegria!" ' },
              ].map((dep, i) => (
                <div key={i} className={`new-testimonial-item ${currentTestimonial === i ? "active" : ""}`}>
                  <div className="new-testimonial-card">
                    <div className="new-testimonial-image">
                      <img src={`${IMAGE_BASE_URL}/imagens/dep/dep${dep.img}.webp`} alt={dep.name} />
                    </div>
                    <div className="new-testimonial-content">
                      <h4>{dep.name}</h4>
                      <p className="pet-name">🐾 Adotou o <strong>{dep.pet}</strong></p>
                      <p className="testimonial-text">{dep.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles do carrossel */}
            <div className="new-testimonials-controls">
              <button className="new-testimonials-btn prev" onClick={prevTestimonial}>‹</button>
              <div className="new-testimonials-indicators">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span
                    key={i}
                    className={`new-testimonials-indicator ${currentTestimonial === i ? "active" : ""}`}
                    onClick={() => setCurrentTestimonial(i)}
                  ></span>
                ))}
              </div>
              <button className="new-testimonials-btn next" onClick={nextTestimonial}>›</button>
            </div>
          </div>
        </section>

        {/* Seção Localização */}
        <section className="location-section">
          <div className="container">
            <h2 className="section-title">Nossa Localização</h2>
            <div className="location-content">
              <div className="map-container">
                <div className="map-wrapper" style={{ position: "relative" }}>
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.912985630355!2d-47.02202282385701!3d-23.60231826365659!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94cf0001f84a6d3d%3A0x6e08c4f6d6d7a8df!2sVargem%20Grande%20Paulista%2C%20SP!5e0!3m2!1spt-BR!2sbr!4v1733675550000!5m2!1spt-BR!2sbr"
                    width="100%"
                    height="400"
                    style={{ border: 0, borderRadius: "16px" }}
                    allowFullScreen
                    loading="lazy"
                    title="Localização - Vargem Grande Paulista, SP"
                  ></iframe>
                  <div className="map-overlay">
                    <div className="map-info">
                      <h4>📍 Resgaute</h4>
                      <p>Vargem Grande Paulista - SP</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção Informações da Organização */}
        <section className="donation-goal-section">
          <div className="container">
            <div className="p-campaign-byline">
              <div className="m-campaign-byline">
                <div className="hrt-align-center hrt-disp-flex">
                  <ul className="hrt-list-unstyled hrt-avatar-stack hrt-mr-2">
                    <li className="hrt-avatar-stack-item hrt-avatar-stack-item--0">
                      <div className="hrt-avatar hrt-avatar--large">
                        <img src={`${IMAGE_BASE_URL}/imagens/logo.webp`} alt="Resgaute" className="hrt-avatar-img" />
                      </div>
                    </li>
                  </ul>
                  <div className="m-campaign-byline-description">Resgaute</div>
                </div>

                <section className="org-card" aria-label="Informações da organização">
                  <div className="org-card__left" style={{ textAlign: "left" }}>
                    <div className="org-card__row">
                      <span className="org-card__icon" aria-hidden="true">
                        <MapPin size={18} />
                      </span>
                      <div className="org-card__text">
                        <strong>Localização</strong>
                        <span>Vargem Grande Paulista, SP · Brasil</span>
                      </div>
                    </div>

                    <div className="org-card__row">
                      <span className="org-card__icon" aria-hidden="true">
                        <Sparkles size={18} />
                      </span>
                      <div className="org-card__text">
                        <strong>CNPJ</strong>
                        <button
                          id="cnpjTrigger2"
                          className="org-card__cnpj"
                          type="button"
                          onClick={() => setIsCnpjModalOpen(true)}
                        >
                          58.439.069/0001-04
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="org-card__right">
                    <span className="org-card__badge" aria-label="Organização verificada">
                      ✅ Documentação disponível
                    </span>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>


        {/* Call to Action Final */}
        <section className="cta-section">
          <div className="container">
            <h2>Faça Parte Desta História</h2>
            <p>
              Cada doação, cada compartilhamento, cada gesto de amor faz a diferença na vida de centenas de animais que dependem da nossa ajuda.
            </p>
          </div>
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <button className="transformation-cta-btn pulse-animation" onClick={openDonationModal}>
              QUERO AJUDAR
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-logo footer-logo" aria-label="Resgaute — Abrigo de animais">
                <img src={`${IMAGE_BASE_URL}/imagens/logonovo.png`} alt="Resgaute — Abrigo de animais" />
              </div>
              <h3>Resgaute</h3>
            </div>

            <div className="footer-info">
              <div className="footer-section">
                <h4>Contato</h4>
                <p>
                  WhatsApp:{" "}
                  <a className="footer-link" href="https://wa.me/5515991903786" target="_blank" rel="noopener noreferrer">
                    +55 13 97409-1379
                  </a>
                </p>
                <p>Email: contato@resgaute.org</p>
              </div>

              <div className="footer-section">
                <h4>Redes Sociais</h4>
                <div className="social-links">
                  <a href="https://www.facebook.com/profile.php?id=61578116921336" target="_blank" rel="noopener noreferrer" className="social-link">
                    Facebook
                  </a>
                  <a href="https://www.instagram.com/resgaute_reserva/" target="_blank" rel="noopener noreferrer" className="social-link">
                    Instagram
                  </a>
                  <a href="https://www.tiktok.com/@resgaute" target="_blank" rel="noopener noreferrer" className="social-link">
                    TikTok
                  </a>
                </div>
              </div>

              <div className="footer-section">
                <h4>Como Ajudar</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); openDonationModal(); }} className="footer-link">Doações PIX</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsExpensesModalOpen(true); }} className="footer-link">Detalhamento Financeiro</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 RESGAUTE. Todos os direitos reservados.</p>
            <p>Desenvolvido com ❤️ para salvar vidas</p>
            <p>58.439.069/0001-04</p>
          </div>
        </div>
      </footer>

      {/* ==========================================================
          MODALS SECTION
          ========================================================== */}

      {/* CNPJ Modal */}
      {isCnpjModalOpen && (
        <div className="modal show" style={{ display: "block" }}>
          <div className="modal__backdrop" onClick={() => setIsCnpjModalOpen(false)}></div>
          <div className="modal__dialog">
            <div className="modal__header">
              <h3>Documento CNPJ</h3>
              <button className="modal__close" onClick={() => setIsCnpjModalOpen(false)}>&times;</button>
            </div>
            <div className="modal__body">
              <img src={`${IMAGE_BASE_URL}/imagens/cnpj.png`} alt="Documento do CNPJ" />
            </div>
          </div>
        </div>
      )}

      {/* Expenses Modal */}
      {isExpensesModalOpen && (
        <div className="expenses-modal show" style={{ display: "flex" }}>
          <div className="modal-content">
            <div className="expenses-modal-header">
              <h2>Detalhamento das Despesas</h2>
              <button className="close-btn" onClick={() => setIsExpensesModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="expenses-modal-body">
              <p className="expenses-intro">Veja como cada centavo é investido no cuidado dos nossos animais:</p>
              <div className="expenses-detailed-list">
                <div className="expense-detail-item">
                  <div className="expense-detail-header">
                    <span className="expense-detail-icon">🥘</span>
                    <span className="expense-detail-title">Ração</span>
                    <span className="expense-detail-amount">R$ 22.558,70</span>
                  </div>
                </div>
                <div className="expense-detail-item">
                  <div className="expense-detail-header">
                    <span className="expense-detail-icon">💊</span>
                    <span className="expense-detail-title">Remédios</span>
                    <span className="expense-detail-amount">R$ 10.612,21</span>
                  </div>
                </div>
                <div className="expense-detail-item">
                  <div className="expense-detail-header">
                    <span className="expense-detail-icon">🏥</span>
                    <span className="expense-detail-title">Veterinário</span>
                    <span className="expense-detail-amount">R$ 20.750,00</span>
                  </div>
                </div>
                <div className="expense-detail-item">
                  <div className="expense-detail-header">
                    <span className="expense-detail-icon">🏠</span>
                    <span className="expense-detail-title">Aluguel</span>
                    <span className="expense-detail-amount">R$ 10.000,00</span>
                  </div>
                </div>
                <div className="expense-detail-item">
                  <div className="expense-detail-header">
                    <span className="expense-detail-icon">📦</span>
                    <span className="expense-detail-title">Outros</span>
                    <span className="expense-detail-amount">R$ 9.125,47</span>
                  </div>
                </div>
              </div>
              <div className="expenses-total" onClick={() => { setIsExpensesModalOpen(false); openDonationModal(); }}>
                <strong>QUERO AJUDAR ❤️</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Intent Popup */}
      {isExitPopupOpen && (
        <div className="exit-popup show" style={{ display: "flex" }}>
          <div className="exit-popup-overlay" onClick={() => setIsExitPopupOpen(false)}></div>
          <div className="exit-popup-content">
            <div className="exit-popup-icon">
              <Check size={32} color="white" strokeWidth={3} />
            </div>
            <h2 className="exit-popup-title">Espere mais um pouco...</h2>
            <p className="exit-popup-text">
              Antes de sair, mais de 500 animais ainda precisam da sua ajuda. Cada doação faz a diferença ❤️
            </p>
            <p className="exit-popup-discount">Sua ajuda pode salvar uma vida hoje!</p>
            <button className="exit-popup-btn" onClick={handleRedirectToSpecialOffer}>
              Quero ajudar os animais!
            </button>
            <button className="exit-popup-close" onClick={() => setIsExitPopupOpen(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Donation Flow Modal */}
      {isDonationModalOpen && (
        <div id="donationModal" className="donation-modal show" style={{ display: "flex" }}>
          <div className="modal-content">
            
            {/* ETAPA 1: Seleção de Valor */}
            {donationStep === 1 && (
              <div id="donationStep1" className="donation-step">
                <div className="modal-header">
                  <h2>Qual valor deseja ajudar?</h2>
                  <button className="close-btn" onClick={closeDonationModal}>
                    <X size={24} />
                  </button>
                </div>

                <div className="donation-tabs">
                  <button
                    className={`donation-tab ${donationType === "unica" ? "active" : ""}`}
                    onClick={() => setDonationType("unica")}
                  >
                    Doação Única
                  </button>
                  <button
                    className={`donation-tab ${donationType === "mensal" ? "active" : ""}`}
                    onClick={() => setDonationType("mensal")}
                  >
                    Doação Mensal
                  </button>
                </div>

                <div className="modal-body">
                  <div className="donation-grid">
                    {[20, 30, 50, 100, 150, 250, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        className={`donation-btn ${selectedAmount === amount ? "selected" : ""}`}
                        onClick={() => handleAmountSelect(amount)}
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>

                  <div className="custom-donation">
                    <p>Ou o que o seu coração sentir <span className="heart">🩵</span></p>
                    <div className="input-container">
                      <span className="currency-symbol">R$</span>
                      <input
                        type="number"
                        placeholder="Digite o valor"
                        min="1"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="donate-btn" onClick={handleStep1Submit}>CONTINUAR</button>
                </div>
              </div>
            )}

            {/* ETAPA 2: Preenchimento de Dados - DOAÇÃO ÚNICA */}
            {donationStep === 2 && donationType === "unica" && (
              <div id="donationStep2Unica" className="donation-step">
                <div className="modal-header">
                  <h2>Complete seus dados</h2>
                  <button className="close-btn" onClick={closeDonationModal}>
                    <X size={24} />
                  </button>
                </div>

                <div className="donation-type-indicator">
                  <span>Doação Única</span>
                </div>

                <div className="modal-body">
                  <div className="selected-amount-display">
                    <p className="amount-value">{formatCurrency(getFinalAmount())}</p>
                  </div>

                  {errorMessage && (
                    <div className="error-message-box" style={{ color: "#dc2626", background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fee2e2", marginBottom: "15px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: "0.9rem" }}>{errorMessage}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="donorPhone">Telefone (WhatsApp): <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "normal" }}>opcional</span></label>
                    <input
                      type="tel"
                      id="donorPhone"
                      placeholder="(00) 00000-0000"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label-turbine">
                      <input
                        type="checkbox"
                        checked={addAdminFee}
                        onChange={(e) => setAddAdminFee(e.target.checked)}
                      />
                      <span className="turbine-title">
                        <Heart size={16} color="#ec4899" fill="#ec4899" style={{ display: "inline", marginRight: "4px" }} />
                        Turbinar doação
                      </span>
                      <p className="turbine-description">Adicionar R$ 6,99 para ajudar com as taxas administrativas</p>
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="donate-btn" onClick={generateContribution}>CONTRIBUIR</button>
                  <button className="back-btn" onClick={() => setDonationStep(1)}>← VOLTAR</button>
                </div>
              </div>
            )}

            {/* ETAPA 2: Preenchimento de Dados - DOAÇÃO MENSAL */}
            {donationStep === 2 && donationType === "mensal" && (
              <div id="donationStep2Mensal" className="donation-step">
                <div className="modal-header">
                  <h2>Complete seus dados</h2>
                  <button className="close-btn" onClick={closeDonationModal}>
                    <X size={24} />
                  </button>
                </div>

                <div className="donation-type-indicator">
                  <span>Doação Mensal</span>
                </div>

                <div className="modal-body">
                  <div className="selected-amount-display">
                    <p className="amount-value">{formatCurrency(getFinalAmount())}</p>
                  </div>

                  {errorMessage && (
                    <div className="error-message-box" style={{ color: "#dc2626", background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fee2e2", marginBottom: "15px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: "0.9rem" }}>{errorMessage}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="donorNameMensal">Nome: <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      id="donorNameMensal"
                      placeholder="Digite seu nome completo"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="donorPhoneMensal">Whatsapp: <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="tel"
                      id="donorPhoneMensal"
                      placeholder="(00) 00000-0000"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="donorEmailMensal">Email: <span style={{ color: "#6b7280", fontWeight: "normal" }}>(opcional)</span></label>
                    <input
                      type="email"
                      id="donorEmailMensal"
                      placeholder="seu@email.com"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="donorDocumentMensal">CPF: <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      id="donorDocumentMensal"
                      placeholder="000.000.000-00"
                      value={donorCpf}
                      onChange={(e) => setDonorCpf(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="donate-btn" onClick={generateContribution}>CONTRIBUIR</button>
                  <button className="back-btn" onClick={() => setDonationStep(1)}>← VOLTAR</button>
                </div>
              </div>
            )}

            {/* ETAPA 3: Loading Message */}
            {donationStep === 3 && (
              <div id="donationLoading" className="donation-loading" style={{ display: "flex" }}>
                <div className="loading-box">
                  <img src={`${IMAGE_BASE_URL}/imagens/logonovo.png`} alt="Logo Resgaute" className="loading-logo" />
                  <div className="loading-spinner"></div>
                  <div className="loading-message">Gerando contribuição, aguarde...</div>
                </div>
              </div>
            )}

            {/* ETAPA 4: Checkout PIX (QR Code & Polling) */}
            {donationStep === 4 && (
              <div className="donation-step">
                <div className="modal-header">
                  <h2>Apoie com PIX</h2>
                  <button className="close-btn" onClick={closeDonationModal}>
                    <X size={24} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="pix-checkout-step">
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "#475569" }}>
                      Escaneie o QR Code abaixo com seu aplicativo de banco ou copie a linha digitável do PIX:
                    </p>

                    <div className="qrcode-wrapper">
                      {qrCodeBase64 ? (
                        <img src={qrCodeBase64} alt="QR Code PIX" className="qrcode-img" />
                      ) : (
                        <div className="loading-spinner"></div>
                      )}
                    </div>

                    <div className="selected-amount-display" style={{ margin: "5px 0" }}>
                      <p className="amount-value" style={{ fontSize: "1.3rem" }}>
                        {formatCurrency(getFinalAmount())}
                      </p>
                    </div>

                    <div style={{ width: "100%" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: "4px" }}>
                        Código Copia e Cola:
                      </label>
                      <div className="pix-code-box">
                        {pixCode}
                      </div>
                    </div>

                    <button
                      className="copy-btn pulse-animation"
                      onClick={() => copyToClipboard(pixCode, setCopiedPix)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        justifyContent: "center",
                        marginTop: "5px"
                      }}
                    >
                      {copiedPix ? <Check size={18} /> : <Copy size={18} />}
                      {copiedPix ? "Código Copiado!" : "Copiar Código PIX"}
                    </button>

                    <div className="polling-container">
                      <div className="polling-spinner"></div>
                      <span>
                        {paymentStatus === "expired"
                          ? "Código expirado. Por favor, tente novamente."
                          : paymentStatus === "failed" || paymentStatus === "canceled"
                          ? "Pagamento falhou ou foi cancelado."
                          : "Aguardando confirmação do pagamento..."}
                      </span>
                    </div>

                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      Gateway ativo: {gatewayUsed}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 5: Doação Confirmada com Sucesso */}
            {donationStep === 5 && (
              <div className="donation-step">
                <div className="modal-body">
                  <div className="success-screen">
                    <div className="success-icon-wrapper">
                      <Check size={48} />
                    </div>
                    
                    <h2 className="success-title">Doação Confirmada!</h2>
                    
                    <p className="success-text">
                      Muito obrigado! Sua contribuição no valor de <strong>{formatCurrency(getFinalAmount())}</strong> foi recebida com sucesso.
                    </p>
                    
                    <p className="success-text">
                      Seu apoio mantém nosso abrigo funcionando e salva a vida de centenas de cães indefesos. <span className="success-heart">🩵</span>
                    </p>

                    <button className="success-btn" onClick={closeDonationModal}>
                      Concluir
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
