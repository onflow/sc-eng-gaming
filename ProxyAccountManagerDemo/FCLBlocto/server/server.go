package server

import (
	"embed"
	"github.com/labstack/echo/v4"
	"io/fs"
	"log"
	"math/rand"
	"net/http"
	"time"
)

//go:embed all:frontend
var content embed.FS

type Server struct {
	e *echo.Echo
}

type TransactionRequest struct {
	PublicKey    string  `json:"public_key" form:"public_key"`
	ProxyName    string  `json:"proxy_name" form:"proxy_name"`
	NFTContract  string  `json:"nft_contract" form:"nft_contract"`
	NTFAddress   string  `json:"nft_address" form:"nft_address"`
	FundAmount   float64 `json:"fund_amount" form:"fund_amount"`
	ProxyAddress string  `json:"proxy_address" form:"proxy_address"`
}

var transactionRequestMap map[string]TransactionRequest

func (s *Server) Start() {
	transactionRequestMap = make(map[string]TransactionRequest)

	s.e = echo.New()

	html, _ := fs.Sub(content, "frontend")

	//Static files
	s.e.GET("/*", echo.WrapHandler(http.FileServer(http.FS(html))))

	//Everything else
	s.e.POST("/submit_transaction", s.SubmitTransaction)
	s.e.GET("/get_transaction_info", s.GetTransactionInfo)
	s.e.GET("/check_transaction", s.CheckTransaction)
	s.e.GET("/set_proxy_address", s.SetProxyAddress)

	_ = s.e.Start("0.0.0.0:9999")
}

func (s *Server) SubmitTransaction(c echo.Context) error {
	tr := TransactionRequest{}
	c.Bind(&tr)
	log.Print(tr)
	requestID := RandString(20)
	transactionRequestMap[requestID] = tr

	return c.String(http.StatusOK, requestID)
}

func (s *Server) CheckTransaction(c echo.Context) error {
	tid := c.QueryParam("id")
	return c.String(http.StatusOK, transactionRequestMap[tid].ProxyAddress)
}

func (s *Server) GetTransactionInfo(c echo.Context) error {
	tid := c.QueryParam("id")
	return c.JSON(200, transactionRequestMap[tid])
}

func (s *Server) SetProxyAddress(c echo.Context) error {
	tid := c.QueryParam("id")
	address := c.QueryParam("address")
	tr := transactionRequestMap[tid]
	tr.ProxyAddress = address
	transactionRequestMap[tid] = tr
	return c.NoContent(200)
}

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func RandString(n int) string {
	rand.Seed(time.Now().UnixMicro())
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return string(b)
}
