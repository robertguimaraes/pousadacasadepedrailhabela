//========================================================================================================
// onLoad da página.                                                                                     .
//========================================================================================================
$(document).ready(function () {
    document.getElementById("sel-criancas").addEventListener("change", selCriancasOnChange);
    document.getElementById("checkin").addEventListener("change", setDataDiaSeguinte);

    document.getElementById("btn-buscar").addEventListener("click", buscar);
})

//========================================================================================================
// Método do botão BUSCAR.                                                                               .
//========================================================================================================
function buscar() {
    limparCanvas();

    if (!validarComponentes()) {
        return;
    }
    
    var objRequest = criarObjRequest(criarPropsRequest());

    postOmnibees(objRequest);
}

//========================================================================================================
// Prepara o objeto de Request para o Post na Omnibees.                                                  .
//========================================================================================================
function criarObjRequest(propsRequest) {
    var obj = {};
    obj.EchoToken = uuidv4();
    obj.TimeStamp = new Date().toISOString();
    obj.Target = 0;
    obj.Version = 0;
    obj.PrimaryLangID = 8;
    obj.AvailRatesOnly = false;
    obj.BestOnly = false;
    obj.IsModify = false;
    obj.RequestedCurrency = 16;
   
    var GuestCountAdultos = {};
    GuestCountAdultos.Age = null;
    GuestCountAdultos.AgeQualifyCode = 10;
    GuestCountAdultos.Count = propsRequest.qtdeAdultos;

    var GuestCounts = [];
    GuestCounts.push(GuestCountAdultos);

    propsRequest.arrayIdades.forEach(function(value) {
        var GuestCountCrianca = {};
        GuestCountCrianca.Age = value;
        GuestCountCrianca.AgeQualifyCode = (value <= 10) ? 7 : 8;
        GuestCountCrianca.Count = 1;

        GuestCounts.push(GuestCountCrianca);
    })

    var GuestCountsType = {};
    GuestCountsType.GuestCounts = GuestCounts;
        
    var RoomStayCandidate = {};
    RoomStayCandidate.GuestCountsType = GuestCountsType;
    RoomStayCandidate.Quantity = 1;
    RoomStayCandidate.RPH = 0;
    RoomStayCandidate.BookingCode = "";

    var RoomStayCandidates = [];
    RoomStayCandidates.push(RoomStayCandidate);

    var RoomStayCandidatesType = {};
    RoomStayCandidatesType.RoomStayCandidates = RoomStayCandidates;
    
    var HotelRef = {};
    HotelRef.ChainCode = null;
    HotelRef.HotelCode = 3661;
    
    var HotelRefs = [];
    HotelRefs.push(HotelRef);

    var StayDateRange = {};
    StayDateRange.Duration = null,
    StayDateRange.Start = propsRequest.dataCheckin;
    StayDateRange.End = propsRequest.dataCheckout;

    var RatePlanCandidate = {};
    RatePlanCandidate.GroupCode = null;
    RatePlanCandidate.PromotionCode = null;

    var RatePlanCandidates = [];
    RatePlanCandidates.push(RatePlanCandidate);

    var RatePlanCandidatesType = {};
    RatePlanCandidatesType.RatePlanCandidates = RatePlanCandidates;

    var TPA_Extensions = {}
    TPA_Extensions.IsForMobile = true;

    var Criterion = {};
    Criterion.RoomStayCandidatesType = RoomStayCandidatesType;
    Criterion.HotelRefs = HotelRefs;
    Criterion.GetPricesPerGuest = true;
    Criterion.StayDateRange = StayDateRange;
    Criterion.RatePlanCandidatesType = RatePlanCandidatesType;
    Criterion.TPA_Extensions = TPA_Extensions;

    var HotelSearchCriteria = {};
    HotelSearchCriteria.AvailableOnlyIndicator = false;
    HotelSearchCriteria.Criterion = Criterion;

    obj.HotelSearchCriteria = HotelSearchCriteria;

    return obj;
}

//========================================================================================================
// Cria o objeto com todos os valores necessários para o request (Post) na Omnibees.                     .
//========================================================================================================
function criarPropsRequest() {
    var propsRequest = {};
    propsRequest.dataCheckin = document.getElementById("checkin").value;
    propsRequest.dataCheckout = document.getElementById("checkout").value;
    propsRequest.codSuite = Number(getValorSelect("sel-suite"));
    propsRequest.qtdeAdultos = Number(getValorSelect("sel-adultos"));
    propsRequest.qtdeCriancas = Number(getValorSelect("sel-criancas"));
    propsRequest.arrayIdades = [];

    if (propsRequest.qtdeCriancas > 0) {
        for (i = 1; i <= qtdeCriancas; i++) {
            propsRequest.arrayIdades.push(Number(getValorSelect("sel-idade-" + i)));
        }
    }

    return propsRequest;
}

//========================================================================================================
// Executa a chamada Post na Omnibees.                                                                   .
//========================================================================================================
function postOmnibees(objRequest) {
    const URL = "https://mobilereservations.omnibees.com/beapi1/api/BE/GetHotelAvail?t=aab46c45b97d059671359e9bf122cc4a";

    /*$.ajax({
        type: "POST",
        dataType: "JSON",
        url: URL,
        data: objRequest,
        success: ((data) => {tratarResponseOmnibees(data, getValorSelect("sel-suite"))}),
        error: (() => {openModal("error", "Falha ao se comunicar com a API da Omnibees.")})
    });*/

    fetch(URL, {
        method: 'POST',
        body: JSON.stringify(objRequest)
    })
    .then(res => res.json())
    .then(data => tratarResponseOmnibees(data, getValorSelect("sel-suite")))
    .catch(err => openModal("error", "Falha ao se comunicar com a API da Omnibees."))
}

//========================================================================================================
// Trata a resposta do Post da Omnibees.                                                                 .
//========================================================================================================
function tratarResponseOmnibees(data, codSuite) {
    const SEM_RESERVA = "Desculpe, não há disponibilidade para a reserva consultada.";

    if (data.RoomStaysType == null) {
        openModal("error", SEM_RESERVA);
        return;
    }

    var room = data.RoomStaysType.RoomStays[0].RoomRates.find(e => e.RoomID == codSuite && e.Availability[0].AvailabilityStatus == "AvailableForSale")

    if (room) {
        var propsRequest = criarPropsRequest();

        prepararImagem(propsRequest, data, codSuite);
    } else {
        openModal("error", SEM_RESERVA);
    }
}

//========================================================================================================
// Monta a estrutura do texto informativo das reservas, em caso de disponibilidade.                      .
//========================================================================================================
function prepararImagem(requestOmnibees, responseOmnibees, codSuite) {
    //==========================
    // Formatação do filtro.   .
    //==========================
    var dataCheckIn = new Date(requestOmnibees.dataCheckin + "T10:30:00-03:00").toLocaleDateString();
    var dataCheckOut = new Date(requestOmnibees.dataCheckout + "T10:30:00-03:00").toLocaleDateString();
    var qtdeDiarias = calcularDiarias(requestOmnibees.dataCheckin, requestOmnibees.dataCheckout);
    qtdeDiarias = qtdeDiarias + (qtdeDiarias > 1 ? " diárias" : " diária");
    var qtdeAdultos = requestOmnibees.qtdeAdultos + " adulto" + (requestOmnibees.qtdeAdultos > 1 ? "s" : "");
    var qtdeCriancas = requestOmnibees.qtdeCriancas + " criança" + (requestOmnibees.qtdeCriancas > 1 ? "s" : "");
    var txtIdades = "";

    if (requestOmnibees.qtdeCriancas > 0) {
        requestOmnibees.arrayIdades.forEach(function(value) {
            txtIdades = txtIdades + (txtIdades == "" ? "(" + value : "/" + value); 
        })

        txtIdades = txtIdades + (txtIdades == "(1" ? ") ano" : ") anos");
    }


    var nomeSuite = "";
    switch (requestOmnibees.codSuite) {
        case 12319:
            nomeSuite = "Suíte Family";
            break;
        case 12328:
            nomeSuite = "Suíte Luxo";
            break;
        case 70697:
            nomeSuite = "Suíte Friends";
            break;
        default:
            nomeSuite = "";
    }

    //==========================
    // Formatação da resposta. .
    //==========================
    var room = responseOmnibees.RoomStaysType.RoomStays[0].RoomRates.find(e => e.RoomID == codSuite && e.Availability[0].AvailabilityStatus == "AvailableForSale")

    var precoTotal = room.Total.AmountBeforeTax;
    
    // var porcentagemDesconto = (precoTotal >= 1000 ? 10 : 5); Alterado dia 21/09/2022 após solicitação da Soraya.
    var porcentagemDesconto = 5;
    
    var divisorComEntrada = 2;
    var divisorSemEntrada = 1;

    if (precoTotal <= 299.99) {
        divisorComEntrada = 2;
        divisorSemEntrada = 1;
    } else if ((precoTotal >= 300) && (precoTotal <= 499.99)) {
        divisorComEntrada = 2;
        divisorSemEntrada = 2;
    } else if ((precoTotal >= 500) && (precoTotal <= 799.99)) {
        divisorComEntrada = 3;
        divisorSemEntrada = 2;
    } else if (precoTotal >= 800) {
        divisorComEntrada = 4;
        divisorSemEntrada = 3;
    }
    
    // Alteração da pocentagem de desconto, de 5% para 20%, solicitado pela Soraya em 25/05/2022.
    var precoTotalCheio = (precoTotal / 80) * 100;
    var precoMetade = (precoTotal / 2);
    var precoTotalDivComEntrada = (precoTotal / divisorComEntrada);
    var precoTotalDivSemEntrada = (precoTotal / divisorSemEntrada);
    // var precoTotalDescontoIntegral = (precoTotal >= 1000 ? precoTotal * 0.90 : precoTotal * 0.95);
    var precoTotalDescontoIntegral = precoTotal - (precoTotal * porcentagemDesconto / 100);

    var precoTotalFormatado = precoTotal.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalCheioFormatado = Number(precoTotalCheio.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoMetadeFormatado = Number(precoMetade.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalDivComEntradaFormatado = Number(precoTotalDivComEntrada.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalDivSemEntradaFormatado = Number(precoTotalDivSemEntrada.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalDescontoIntegralFormatado = Number(precoTotalDescontoIntegral.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});

    //==========================
    // Preenchimento da imgagem.
    //==========================
    var imagemFundo = new Image();
    var imgFundoPath = resgatarPathImagemFundo(requestOmnibees.dataCheckout);
    imagemFundo.src = imgFundoPath;
    imagemFundo.onload = function(){
        var canvas = document.getElementById('canvas');
        canvas.width  = imagemFundo.width;
        canvas.height = imagemFundo.height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(imagemFundo, 0, 0);
        ctx = canvas.getContext('2d');

        //==========================
        // Ícones.                 .
        //==========================
        const font = '900 48px "Font Awesome 5 Free"';
        document.fonts.load(font).then((_) => {
            ctx.font = '900 25px "Font Awesome 5 Free"';

            // Ícones filtro.
            ctx.fillStyle = 'white';
            ctx.strokeStyle= "black";
            ctx.lineWidth = 7;
            ctx.font = 'bold "Font Awesome 5 Free"';
            wrapText(ctx, '\uF274', 740, 58, 950, 35);  // Checkin
            wrapText(ctx, '\uF273', 740, 92, 950, 35);  // Checkout
            wrapText(ctx, '\uF017', 739, 128, 950, 35); // Diárias
            wrapText(ctx, '\uF236', 737, 165, 950, 35); // Suíte
            wrapText(ctx, '\uF183', 748, 197, 950, 35); // Qdte adultos
            
            if (requestOmnibees.qtdeCriancas > 0) {
                wrapText(ctx, '\uF77c', 743, 231, 950, 35); // Qtde crianças
            }

            // Ícones formas pagto.
            ctx.fillStyle = "yellow";
            wrapText(ctx, '\uF0a4', 25, 420, 950, 35);
            wrapText(ctx, '\uF0a4', 25, 520, 950, 35);
            wrapText(ctx, '\uF0a4', 25, 620, 950, 35);
            wrapText(ctx, '\uF0a4', 25, 680, 950, 35);

            //==========================
            // Texto central valor.    .
            //==========================
            ctx.fillStyle = 'white';
            ctx.strokeStyle= "black";
            ctx.lineWidth = 7;
            ctx.font = "bold 32pt Tahoma";
            var txtValor = "De " + precoTotalCheioFormatado + " por " + precoTotalFormatado;
            var textWidth = ctx.measureText(txtValor).width;
            var posCentral = (canvas.width/2) - (textWidth / 2);
            wrapText(ctx, txtValor, posCentral, 350, 1000, 35);

            //==========================
            // X preço antigo (De).    .
            //==========================
            pixelInicialRisco = posCentral + ctx.measureText("De ").width - 5;
            pixelFinalRisco = pixelInicialRisco + ctx.measureText(precoTotalCheioFormatado).width + 10;

            ctx.lineWidth = 6;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            ctx.moveTo(pixelInicialRisco - 3, 315);
            ctx.lineTo(pixelFinalRisco + 3, 355);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FF0000";
            ctx.beginPath();
            ctx.moveTo(pixelInicialRisco, 315);
            ctx.lineTo(pixelFinalRisco, 355);
            ctx.stroke();

            ctx.lineWidth = 6;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            ctx.moveTo(pixelInicialRisco - 3, 355);
            ctx.lineTo(pixelFinalRisco + 3, 315);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FF0000";
            ctx.beginPath();
            ctx.moveTo(pixelInicialRisco, 355);
            ctx.lineTo(pixelFinalRisco, 315);
            ctx.stroke();

            //==========================
            // Textos do filtro.       .
            //==========================
            ctx.fillStyle = 'white';
            ctx.strokeStyle= "black";
            ctx.lineWidth = 7;
            ctx.font = "bold 22pt Tahoma";
            wrapText(ctx, dataCheckIn, 780, 60, 200, 35);  // Checkin
            wrapText(ctx, dataCheckOut, 780, 95, 200, 35); // Checkout
            wrapText(ctx, qtdeDiarias, 780, 130, 200, 35); // Diárias
            wrapText(ctx, nomeSuite, 780, 165, 200, 35);   // Suíte
            wrapText(ctx, qtdeAdultos, 780, 200, 200, 35); // Qtde adultos
            
            if (requestOmnibees.qtdeCriancas > 0) {
                wrapText(ctx, qtdeCriancas, 780, 235, 200, 35); // Qtde crianças

                ctx.font = "15pt Tahoma";
                wrapText(ctx, txtIdades, 780, 265, 200, 35); // Idade(s) criança(s)
            }

            //=========================================
            // Decide cor da frase de validade.       .
            //=========================================
            if (imgFundoPath == "img/fundo_default.png") {
                ctx.fillStyle = 'yellow';
                ctx.strokeStyle= "black";
            } else if (imgFundoPath == "img/fundo_natal.png") {
                ctx.fillStyle = '#5ee500';
                ctx.strokeStyle= "black";
            } else if (imgFundoPath == "img/fundo_reveillon.png") {
                ctx.fillStyle = 'orange';
                ctx.strokeStyle= "black";
            } else if (imgFundoPath == "img/fundo_ferias.png") {
                ctx.fillStyle = '#fe360c';
                ctx.strokeStyle= "#e0ebeb";
            }
            
            ctx.lineWidth = 4;
            ctx.font = "bold 10pt Tahoma";
            var txtFrase = "Valor e condições válidos apenas para compras realizadas diretamente com a pousada.";
            var textWidth = ctx.measureText(txtFrase).width;
            wrapText(ctx, txtFrase, (canvas.width/2) - (textWidth / 2), 375, 950, 35);

            //==========================
            // Textos formas pagto.    .
            //==========================
            ctx.fillStyle = 'white';
            ctx.strokeStyle= "black";
            ctx.lineWidth = 4;
            ctx.font = "bold 15pt Tahoma";
            wrapText(ctx, '        ' + precoTotalFormatado + ' - Pagamento de 50% (' + precoMetadeFormatado + ') na reserva utilizando cartão ou depósito, e os outros 50% (' + precoMetadeFormatado + ') no check-in.', 20, 420, 950, 35);
            wrapText(ctx, '        ' + precoTotalFormatado + ' - ' + divisorComEntrada + 'x sem juros, sendo a primeira parcela (' + precoTotalDivComEntradaFormatado + ') no depósito e o restante no cartão em ' + (divisorComEntrada - 1) + 'x sem juros. Passar o cartão no ato da reserva.', 20, 520, 950, 35);
            wrapText(ctx, '        ' + precoTotalFormatado + ' - ' + divisorSemEntrada + 'x sem juros (' + precoTotalDivSemEntradaFormatado + '). Passar o cartão no ato da reserva.', 20, 620, 950, 35);
            //wrapText(ctx, '        ' + precoTotalDescontoIntegralFormatado + ' - Já com ' + porcentagemDesconto + '% de desconto para pagamento à vista, via depósito integral no ato da reserva. Bancos - Itaú ou Santander.', 20, 680, 950, 35);
            wrapText(ctx, '        ' + precoTotalDescontoIntegralFormatado + ' - Já com ' + porcentagemDesconto + '% de desconto para pagamento à vista, via PIX ou depósito integral, no ato da reserva.', 20, 680, 950, 35);
            
            document.getElementById("imagemFinal").src = canvas.toDataURL("image/png");
            // openModal("success", ""); // Tirar hidden do canvas (HTML) para ver o resultado da imagem.
            $('#modalImagemSucesso').modal('show'); 
        })
    };
}

//========================================================================================================
// Funções de apoio.                                                                                     .
//========================================================================================================
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getValorSelect(idSelect) {
    var e = document.getElementById(idSelect);
    return e.options[e.selectedIndex].value;
}

function openModal(type, message) {
    document.getElementById("id-modal-dialog").classList.remove("modal-success");
    document.getElementById("id-modal-dialog").classList.remove("modal-warning");
    document.getElementById("id-modal-dialog").classList.remove("modal-warning");

    document.getElementById("id-icon-dialog").classList.remove("fa-check-circle");
    document.getElementById("id-icon-dialog").classList.remove("fa-exclamation-triangle");
    document.getElementById("id-icon-dialog").classList.remove("fa-times");
    
    document.getElementById("id-button-dialog").classList.remove("btn-outline-success");
    document.getElementById("id-button-dialog").classList.remove("btn-outline-warning");
    document.getElementById("id-button-dialog").classList.remove("btn-outline-danger");
    
    switch (type) {
        case "success":
            document.getElementById("id-title").innerHTML = "Sucesso";
            document.getElementById("id-modal-dialog").classList.add("modal-success");
            document.getElementById("id-icon-dialog").classList.add("fa-check-circle");
            document.getElementById("id-button-dialog").classList.add("btn-outline-success");
            break;
        case "warning":
            document.getElementById("id-title").innerHTML = "Atenção!";
            document.getElementById("id-modal-dialog").classList.add("modal-warning");
            document.getElementById("id-icon-dialog").classList.add("fa-exclamation-triangle");
            document.getElementById("id-button-dialog").classList.add("btn-outline-warning");
            break;
        case "error":
            document.getElementById("id-title").innerHTML = "Ocorreu um erro!";
            document.getElementById("id-modal-dialog").classList.add("modal-danger");
            document.getElementById("id-icon-dialog").classList.add("fa-times");
            document.getElementById("id-button-dialog").classList.add("btn-outline-danger");
            break;
        default:

    }

    document.getElementById("mensagem-modal").innerHTML = message;
    $("#centralModal").modal();
}

var calcularDiarias = function(dataCheckin, dataCheckout) {
    dt1 = new Date(dataCheckin);
    dt2 = new Date(dataCheckout);
    return Math.floor((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate()) ) /(1000 * 60 * 60 * 24));
}

function setDataDiaSeguinte() {
    document.getElementById("checkout").value = document.getElementById("checkin").value;
}

function selCriancasOnChange() {
    qtdeCriancas = getValorSelect("sel-criancas");

    controlaCompsIdades(qtdeCriancas);
}

function controlaCompsIdades(qtdeCriancas) {
    for (i = 1; i <= 4; i++) {
        $('#div-sel-idade-' + i).hide(0);
    }

    for (i = 0; i <= qtdeCriancas; i++) {
        $('#div-sel-idade-' + i).show(500);
    }
}

function removerFundoVermelhoComps() {
    // Remove o indicador vermelho de todos os componentes que anteriormente não foram preenchidos.
    var comps = ["div-checkin", "div-checkout", "sel-idade-1", "sel-idade-2", "sel-idade-3", "sel-idade-4",];
    for (i = 0; i < comps.length; i++) {
        document.getElementById(comps[i]).classList.remove("alert-danger");
    }
}

function validarComponentes() {
    removerFundoVermelhoComps();

    if (document.getElementById("checkin").value == "") {
        openModal("warning", "Por favor, selecione a data do check-in");
        document.getElementById("div-checkin").classList.add("alert-danger");
        document.getElementById("checkin").focus();
        return false;
    }

    if (document.getElementById("checkout").value == "") {
        openModal("warning", "Por favor, selecione a data do check-out");
        document.getElementById("div-checkout").classList.add("alert-danger");
        document.getElementById("checkout").focus();
        return false;
    }

    var qtdeAdultos = Number(getValorSelect("sel-adultos"));
    var qtdeCriancas = Number(getValorSelect("sel-criancas"));
    if (qtdeAdultos + qtdeCriancas > 5) {
        openModal("warning", "Existem " + (qtdeAdultos + qtdeCriancas) + " hóspedes nesta cotação, mas o máximo permitido são 5 hóspedes por suíte.");
        document.getElementById("sel-adultos").focus();
        return false;
    }

    for (i = 1; i <= qtdeCriancas; i++) {
        if (Number(document.getElementById("sel-idade-" + i).value) < 0) {
            openModal("warning", "Por favor, selecione a idade de todas as crianças.");
            document.getElementById("sel-idade-" + i).classList.add("alert-danger");
            document.getElementById("sel-idade-" + i).focus();
            return false;
        }
    }

    return true;
}

function limparCanvas() {
    var canvas = document.getElementById('canvas');
    canvas.height = 0;
    canvas.width = 0;

    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Limpa o source da imagem png.
    document.getElementById("imagemFinal").src = "";
};

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';

    for(var n = 0; n < words.length; n++) {
        var testLine = line + words[n] + ' ';
        var metrics = context.measureText(testLine);
        var testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.strokeText(line, x, y);
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }

    context.strokeText(line, x, y);
    context.fillText(line, x, y);
}

function resgatarPathImagemFundo(checkOut) {
    var dataCheckOut = new Date(checkOut + "T00:00:00-03:00");
    var pathImagemFundo = "";
    
    // Obs.: Meses no JS são armazenados em array.
    // [0] -> Janeiro, [1] -> Fevereiro, [3] -> Março...

    // Default (laranja)
    if (dataCheckOut >= new Date(dataCheckOut.getFullYear(), 1, 1) && dataCheckOut <= new Date(dataCheckOut.getFullYear(), 11, 23)) {
        pathImagemFundo = "img/fundo_default.png";
    }
    
    // Natal
    if (dataCheckOut >= new Date(dataCheckOut.getFullYear(), 11, 24) && dataCheckOut <= new Date(dataCheckOut.getFullYear(), 11, 26)) {
        pathImagemFundo = "img/fundo_default.png"; // Fundo de Natal removido após a Soraya solicitar a remoção em 16/11/2020.
        // pathImagemFundo = "img/fundo_default.png"; // Fundo de Natal inserido novamente, após solicitação da Soraya em 13/09/2021.
        // pathImagemFundo = "img/fundo_natal.png"; // Fundo de Natal com data alterada de (25/12 -> 30/12) para (24/12 -> 26/12), após solicitação da Soraya em 13/12/2021
        // pathImagemFundo = "img/fundo_natal.png"; // Fundo de Natal removido após a Soraya solicitar a remoção em 21/12/2021.
    }
    
    // Reveillon
    if (dataCheckOut >= new Date(dataCheckOut.getFullYear(), 0, 1) && dataCheckOut <= new Date(dataCheckOut.getFullYear(), 0, 3)) {
        pathImagemFundo = "img/fundo_reveillon.png";
    }

    // Férias
    if (dataCheckOut >= new Date(dataCheckOut.getFullYear(), 0, 4) && dataCheckOut <= new Date(dataCheckOut.getFullYear(), 0, 31)) {
        pathImagemFundo = "img/fundo_ferias.png";
    }

    // Dias 27/12 até 31/12 não estão sendo verificados, por isto volto a imagem padrão caso o checkout seja em um destes dias.
    return (pathImagemFundo != "" ? pathImagemFundo : "img/fundo_default.png");
}

$(function() {
    $('.pop').on('click', function() {
        $('.imagepreview').attr('src', $(this).find('img').attr('src'));
        $('#imagemodal').modal('show');   
    });		
});

//========================================================================================================
// SEM USO!!!                                                                                            .
// Monta a estrutura do texto informativo das reservas, em caso de disponibilidade.                      .
// SEM USO!!!                                                                                            .
//========================================================================================================
function criarTextoReserva(requestOmnibees, responseOmnibees, codSuite) {
    var dataCheckIn = new Date(requestOmnibees.dataCheckin + "T10:30:00-03:00").toLocaleDateString();
    var dataCheckOut = new Date(requestOmnibees.dataCheckout + "T10:30:00-03:00").toLocaleDateString();
    var qtdeDiarias = calcularDiarias(requestOmnibees.dataCheckin, requestOmnibees.dataCheckout);
    var qtdeAdultos = requestOmnibees.qtdeAdultos + " adulto" + (requestOmnibees.qtdeAdultos > 1 ? "s" : "");
    var qtdeCriancas = requestOmnibees.qtdeCriancas + " criança" + (requestOmnibees.qtdeCriancas > 1 ? "s" : "");
    var txtIdades = "";
    requestOmnibees.arrayIdades.forEach(function(value) {
        txtIdades = txtIdades + (txtIdades == "" ? value : "/" + value); 
    })

    var nomeSuite = "";
    switch (requestOmnibees.codSuite) {
        case 12319:
            nomeSuite = "Suíte Family";
            break;
        case 12328:
            nomeSuite = "Suíte Luxo";
            break;
        case 70697:
            nomeSuite = "Suíte Friends";
            break;
        default:
            nomeSuite = "";
    }

    var txt = "";
    txt = 
        "<div class='row mr-0'>" +
            "<div class='col-md-5 text-right ml-4'>" +
                "<i class='fas fa-calendar-check fa-lg align-right' style='margin-right: 4px;'></i>" +
            "</div>" +
            "<div class='col-md-5 text-left px-0'>" +
                "<b>" + dataCheckIn + "</b>" +
            "</div>" +
        "</div>";
    
    txt = txt +
        "<div class='row mr-0'>" +
            "<div class='col-md-5 text-right ml-4'>" +
                "<i class='fas fa-calendar-times fa-lg' style='margin-right: 4px;'></i> " +
            "</div>" +
            "<div class='col-md-5 text-left px-0'>" +
                "<b>" + dataCheckOut + "</b>" +
            "</div>" +
        "</div>";

    txt = txt + 
        "<div class='row mr-0'>" +
            "<div class='col-md-5 text-right ml-4'>" +
                "<i class='fas fa-clock fa-lg' style='margin-right: 3px;'></i> " +
            "</div>" +
            "<div class='col-md-5 text-left px-0'>" +
                "<b>" + qtdeDiarias + " diária" + (qtdeDiarias > 1 ? "s" : "") + "</b>" +
            "</div>" +
        "</div>";
        
    txt = txt + 
        "<div class='row mr-0'>" +
            "<div class='col-md-5 text-right ml-4'>" +
                "<i class='fas fa-bed fa-lg'></i> " +
            "</div>" +
            "<div class='col-md-5 text-left px-0'>" +
                "<b>" + nomeSuite + "</b>" +
            "</div>" +
        "</div>";

    txt = txt + 
        "<div class='row mr-0'>" +
            "<div class='col-md-5 text-right ml-4'>" +
                "<i class='fas fa-male fa-lg' style='margin-right: 8px;'></i> " +
            "</div>" +
            "<div class='col-md-5 text-left px-0'>" +
                "<b>" + qtdeAdultos + "</b>" +
            "</div>" +
        "</div>";
            
    if (requestOmnibees.qtdeCriancas > 0) {
        txt = txt +
            "<div class='row mr-0'>" +
                "<div class='col-md-5 text-right ml-4'>" +
                    "<i class='fas fa-baby fa-lg' style='margin-right: 4px;'></i> " +
                "</div>" +
                "<div class='col-md-5 text-left px-0'>" +
                    "<b>" + qtdeCriancas + "</b>" +
                "</div>" +
            "</div>" +
            "<div class='row mr-0'>" +
                "<div class='col-md-5 text-right ml-4'></div>" +
                "<div class='col-md-5 text-left px-0'>" +
                    "(" + txtIdades + ") anos" +
                "</div>" +
            "</div>";
    }

    var room = responseOmnibees.RoomStaysType.RoomStays[0].RoomRates.find(e => e.RoomID == codSuite && e.Availability[0].AvailabilityStatus == "AvailableForSale")

    var precoTotal = room.Total.AmountBeforeTax;
    var precoTotalCheio = (precoTotal / 95) * 100;
    var precoTotalDiv2 = (precoTotal / 2);
    var precoTotalDiv3 = (precoTotal / 3);
    var precoTotalDescontoDeposito = (precoTotal * 0.95);

    var precoTotalFormatado = precoTotal.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalCheioFormatado = Number(precoTotalCheio.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalDiv2Formatado = Number(precoTotalDiv2.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalDiv3Formatado = Number(precoTotalDiv3.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
    var precoTotalDescontoDepositoFormatado = Number(precoTotalDescontoDeposito.toFixed(2)).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});

    txt = txt + 
        "<br>" +
        "<div class='row mr-0'>" +
            "<div class='col-md-12'>" +
                "<h4>De <b><strike>" + precoTotalCheioFormatado + "</strike></b> por <b>" + precoTotalFormatado + "</b></h4>" +
                "<br>" +
                "<div class='text-left'>" +
                    "<i class='fas fa-hand-point-right'></i> <b>" + precoTotalFormatado + "</b> - Pagamento de 50% (<b>" + precoTotalDiv2Formatado + "</b>) na reserva, e os outros 50% (<b>" + precoTotalDiv2Formatado + "</b>) utilizando cartão ou depósito.<br><br>" +
                    "<i class='fas fa-hand-point-right'></i> <b>" + precoTotalFormatado + "</b> - 3x sem juros, sendo a primeira parcela (<b>" + precoTotalDiv3Formatado + "</b>) no depósito e o restante no cartão em 2x sem juros. Passar o cartão no ato da reserva.<br><br>" +
                    "<i class='fas fa-hand-point-right'></i> <b>" + precoTotalFormatado + "</b> - 2x sem juros (<b>" + precoTotalDiv2Formatado + "</b>). Passar o cartão no ato da reserva.<br><br>" +
                    "<i class='fas fa-hand-point-right'></i> <b>" + precoTotalDescontoDepositoFormatado + "</b> - Já com 5% de desconto para pagamento à vista, via depósito integral no ato da reserva. Bancos - Itaú ou Santander." +
                "</div>" +
            "</div>" +
        "</div>";

    return txt;
}