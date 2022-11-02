cd frontend
npm run build
cd ..
Copy-Item .\frontend\public\* .\server\frontend\
go build
.\FCLBlocto.exe