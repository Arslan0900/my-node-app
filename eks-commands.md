First step create the eks cluster into aws by using aws-cli .

\-> create a eks setup normaly :



   eksctl create cluster \\

   --name my-eks-cluster \\

   --region us-east-1 \\

   --nodegroup-name workers \\

   --node-type t2.medium \\

   --nodes 2



\-> if you want to create a cheapest resources the use this:



   eksctl create cluster \\

   --name my-eks-cluster \\

   --region us-east-1 \\

   --nodegroup-name app-workers \\

   --node-type t3.small \\

   --nodes 1 \\

   --nodes-min 1 \\

   --nodes-max 2 \\

   --managed \\

   --spot



there is we use the only one node with t3.small server this is the cheapest for dev and testing .



\----------------------------------------------------------------------------------------------

\-> how to deploy the eks :



create the ECR with this command to push the docker image 



aws ecr create-repository --repository-name backend-app --region us-east-1

aws ecr create-repository --repository-name frontend-app --region us-east-1



after that push image by using the ECR image pushing command help on the AWS ECR page is there is two images frontend and backend push both on them with the latest tag in there separate registry like frontend and backend for example there is the sample command to push the image into ERC:



docker tag backend-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/backend-app:latest

docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/backend-app:latest

docker tag frontend-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/frontend-app:latest

docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/frontend-app:latest



after that create a deployment and service files for your application deployment for example :



\-> nano backend-deployment.yaml



deployment.yaml example file :



apiVersion: apps/v1

kind: Deployment

metadata:

   name: backend

spec:

   replicas: 1

   selector:

     matchLabels:

       app: backend

   template:

     metadata:

       labels:

         app: backend

     spec:

       containers:

       - name: backend

         image: <your-backend-ecr-image>

         ports:

         - containerPort: 3000



\-> service.yaml example file :



apiVersion: v1

kind: Service

metadata:

   name: backend-service

spec:

   selector:

     app: backend

   ports:

     - port: 80

       targetPort: 3000

   type: ClusterIP



after that apply these by this command 



kubectl apply -f backend-deployment.yaml

kubectl apply -f backend-service.yaml



after that check the status its running or not by 



kubectl get pods 



and if its running then check the loadbalanec url this is your public url by this command 



kubectl get svc



\----------------------------------------------------------------------------------------------



\-> there is some command to debug the error in eks and there some techniques that used for debugging . why its note getting start working correctly :



kubectl get nodes :

kubectl get svc : check the ip and load balancer 

kubectl get pods : check the pod status 

kubectl logs <pod-name> :check logs 

kubectl describe pod <pod-name>

kubectl describe svc frontend-service

kubectl get pods -o wide

kubectl get pods --show-labels

kubectl get svc frontend-service	

\----------------------------------------------------------------------------------------------

\-> port forwarding technique : 



kubectl port-forward service/backend-service 5000:80

http://localhost:5000



then open the localhost with port 80 its showing in your localhost 



\----------------------------------------------------------------------------------------------

\-> busybox technique : this is create a mini Linux container inside Kubernetes and then you check the frontend and backend services running fine or not by send the get request if its working fine then its give you the html format it frontend working and its backend then its gives you the api response 



kubectl run test --rm -it --image=busybox -- sh

wget -qO- http://frontend-service

wget -qO- http://backend-service



then open the localhost with port 80 its showing in your localhost 



\----------------------------------------------------------------------------------------------



\-> this is the way to test the deployment :



kubectl create deployment nginx --image=nginx

kubectl expose deployment nginx --type=LoadBalancer --port=80



\----------------------------------------------------------------------------------------------



\-> if you want to delete the cluster then use this command to do that :



eksctl delete cluster --name my-eks-cluster --region us-east-1



\----------------------------------------------------------------------------------------------
-> For the ingress first we install the AWS Load Balancer Controller and for that we have to create IAM Policy and a IAM Service account and creating a OIDC for kubernates and IAM communication and then install the Helm and add its helm chart repo and with the help of helm install the AWS loadbalancer controller  and then we use ingress for controlling the route with one endpoint 

First create IAM policy with this command first download the policy json and the create with the aws-cli command:

curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam\_policy.json

aws iam create-policy \\

   --policy-name AWSLoadBalancerControllerIAMPolicy \\

   --policy-document file://iam\_policy.json

After creating a policy we need a OIDC for creating a IAM service account 

What is OIDC (Simple Explanation) 



OIDC = a bridge between:


Kubernetes Service Account and AWS IAM Role

use this command to create this oidc for kubernates command needs your eks cluster name and region

  eksctl utils associate-iam-oidc-provider \\

   --region us-east-1 \\

   --cluster my-eks-cluster \\

   --approve

after that create a IAM account with this command its required your eks cluster name ,namespace , account id  and region :

eksctl create iamserviceaccount \\

   --cluster my-eks-cluster \\

   --namespace kube-system \\

   --name aws-load-balancer-controller \\

   --attach-policy-arn arn:aws:iam::<ACCOUNT\_ID>:policy/AWSLoadBalancerControllerIAMPolicy \\

   --approve \\

   --region us-east-1

after creating this installing helm in ubuntu and install the ALB controller into aws :


there are two ways to install the helm 

1\. curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

2\. sudo snap install helm --classic

check its version to verifying its installed 
	**"helm version"
after that add the helm chart git repo by this command 
 	"helm repo update"**

after that Install AWS Load Balancer Controller for ingress by this command :

  helm install aws-load-balancer-controller eks/aws-load-balancer-controller \\

   -n kube-system \\

   --set clusterName=my-eks-cluster \\

   --set serviceAccount.create=false \\

   --set serviceAccount.name=aws-load-balancer-controller

after that to verifying its install correctly this use this command to check this 

	kubectl get pods -n kube-system


its show just like that "aws-load-balancer-controller-xxxxx   Running" if its running then its setup correctly .

ingress.yaml file :

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80

kubectl apply -f ingress.yaml

now your ingress working correctly .

and if you want to delete all these recourses then use these command to do that :

kubectl delete deployment frontend
kubectl delete deployment backend
kubectl delete service frontend-service
kubectl delete service backend-service
kubectl delete ingress app-ingress

helm list -n kube-system
helm uninstall aws-load-balancer-controller -n kube-system

eksctl delete iamserviceaccount \
  --cluster my-eks-cluster \
  --namespace kube-system \
  --name aws-load-balancer-controller

Optional:
 eksctl utils disassociate-iam-oidc-provider \
  --cluster my-eks-cluster \
  --region us-east-1

eksctl delete cluster --name my-eks-cluster --region us-east-1


